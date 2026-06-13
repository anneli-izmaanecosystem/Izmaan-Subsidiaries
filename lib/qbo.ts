import { redis } from './redis'

const TOKEN_KEY = 'qbo:tokens'
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const BASE_URL  = 'https://quickbooks.api.intuit.com/v3/company'

function clientId()     { return process.env.QBO_CLIENT_ID! }
function clientSecret() { return process.env.QBO_CLIENT_SECRET! }
function redirectUri()  { return process.env.QBO_REDIRECT_URI! }

export interface QBOTokens {
  access_token: string
  refresh_token: string
  realmId: string
  expiresAt: number
}

export interface QBOCustomer {
  Id: string
  DisplayName: string
  Balance: number
  Active: boolean
}

export interface Transaction {
  date: string
  type: string
  num: string
  memo: string
  amount: number
  balance: number
}

export interface CustomerStatement {
  customer: { name: string; balance: number }
  period: { start: string; end: string }
  openingBalance: number
  transactions: Transaction[]
  closingBalance: number
  ageing: { current: number; days30: number; days60: number; days90: number; over90: number }
}

// ── OAuth state helpers (CSRF protection) ────────────────────────────────────

const STATE_PREFIX = 'qbo:oauth:state:'

export async function saveOAuthState(state: string) {
  await redis.set(`${STATE_PREFIX}${state}`, '1', { ex: 300 })
}

export async function verifyOAuthState(state: string): Promise<boolean> {
  const key = `${STATE_PREFIX}${state}`
  const val = await redis.getdel(key)
  return val !== null && val !== undefined
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function basicAuth() {
  return 'Basic ' + Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')
}

export async function saveTokens(tokens: QBOTokens) {
  await redis.set(TOKEN_KEY, tokens)
}

export async function getTokens(): Promise<QBOTokens | null> {
  return redis.get<QBOTokens>(TOKEN_KEY)
}

export async function getValidTokens(): Promise<QBOTokens> {
  const tokens = await getTokens()
  if (!tokens) throw new Error('QBO not connected. Visit Settings to connect.')

  if (Date.now() > tokens.expiresAt - 60_000) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`)
    const refreshed: QBOTokens = { ...tokens, ...data, expiresAt: Date.now() + data.expires_in * 1000 }
    await saveTokens(refreshed)
    return refreshed
  }

  return tokens
}

// ── OAuth URL ─────────────────────────────────────────────────────────────────

export function getAuthUrl(state: string) {
  return `https://appcenter.intuit.com/connect/oauth2?${new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })}`
}

export async function exchangeCode(code: string, realmId: string): Promise<QBOTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri() }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Token exchange failed: ${JSON.stringify(data)}`)
  return { ...data, realmId, expiresAt: Date.now() + data.expires_in * 1000 }
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function qboGet(path: string, params?: Record<string, string>) {
  const tokens = await getValidTokens()
  const url = new URL(`${BASE_URL}/${tokens.realmId}/${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  url.searchParams.set('minorversion', '70')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`QBO ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Customer list ─────────────────────────────────────────────────────────────

export async function listCustomers(): Promise<QBOCustomer[]> {
  const data = await qboGet('query', {
    query: "SELECT Id, DisplayName, Balance, Active FROM Customer WHERE Active = true ORDERBY DisplayName ASC MAXRESULTS 1000",
  })
  return data.QueryResponse?.Customer ?? []
}

// ── Customer Statement ────────────────────────────────────────────────────────

// Transaction types that reduce AR balance (should be shown as negative)
const CREDIT_TYPES = ['payment', 'credit memo', 'credit card credit', 'refund receipt', 'journal entry']

function parseReportRows(report: any): Transaction[] {
  const cols: any[] = report.Columns?.Column ?? []
  const rows: Transaction[] = []

  // Match by ColType first (exact, normalised), then fall back to ColTitle contains
  function getIdx(key: string): number {
    const norm = key.toLowerCase().replace(/_/g, ' ')
    let i = cols.findIndex((c: any) => (c.ColType ?? '').toLowerCase().replace(/_/g, ' ') === norm)
    if (i === -1) i = cols.findIndex((c: any) => (c.ColTitle ?? '').toLowerCase().includes(norm))
    return i
  }

  function walk(rowArray: any[]) {
    for (const row of rowArray) {
      if (row.type === 'Data' && row.ColData) {
        const vals    = row.ColData.map((c: any) => c.value ?? '')
        const txType  = vals[getIdx('txn_type')] ?? ''
        const rawAmt  = parseFloat(vals[getIdx('net_amount')] ?? '0') || 0
        const qboBal  = parseFloat(vals[getIdx('balance')]    ?? 'NaN')

        // Ensure credits (payments, credit memos, etc.) are always negative
        const isCredit = CREDIT_TYPES.some(t => txType.toLowerCase().includes(t))
        const amount   = isCredit ? -Math.abs(rawAmt) : Math.abs(rawAmt)

        rows.push({
          date:    vals[getIdx('tx_date')]  ?? '',
          type:    txType,
          num:     vals[getIdx('doc_num')]  ?? '',
          memo:    vals[getIdx('memo')]     ?? vals[getIdx('name')] ?? '',
          amount,
          balance: isNaN(qboBal) ? 0 : qboBal, // use QBO's own balance if available
        })
      }
      if (row.Rows?.Row) walk(row.Rows.Row)
    }
  }

  if (report.Rows?.Row) walk(report.Rows.Row)
  return rows
}

export async function getCustomerStatement(
  customerId: string,
  startDate: string,
  endDate: string,
): Promise<CustomerStatement> {
  // Validate customerId is a numeric string to prevent injection
  if (!/^\d+$/.test(customerId)) throw new Error('Invalid customer ID')

  const tokens = await getValidTokens()

  // Fetch customer record by ID (safe — ID is always numeric)
  const custData = await qboGet('query', {
    query: `SELECT Id, DisplayName, Balance FROM Customer WHERE Id = '${customerId}' MAXRESULTS 1`,
  })
  const customer = custData.QueryResponse?.Customer?.[0]
  if (!customer) throw new Error('Customer not found')

  // Fetch transactions — include QBO's own balance column for accurate running totals
  const report = await qboGet('reports/TransactionList', {
    start_date: startDate,
    end_date:   endDate,
    customer:   customerId,
    columns:    'tx_date,txn_type,doc_num,name,memo,net_amount,balance',
  })

  const rawTxs = parseReportRows(report)

  // Use QBO's own balance column if available (most accurate).
  // Otherwise fall back to deriving from customer.Balance (today's live balance).
  const hasQBOBalance = rawTxs.length > 0 && rawTxs[rawTxs.length - 1].balance !== 0
  let openingBalance: number
  let transactions: Transaction[]

  if (hasQBOBalance) {
    // QBO balance column is per-row running balance — opening is balance before first tx
    const firstBal = rawTxs[0]?.balance ?? 0
    const firstAmt = rawTxs[0]?.amount  ?? 0
    openingBalance = firstBal - firstAmt
    transactions   = rawTxs // balances already set from QBO
  } else {
    // Fallback: derive from customer's live balance
    const closingBalance = customer.Balance ?? 0
    const totalInPeriod  = rawTxs.reduce((sum, tx) => sum + tx.amount, 0)
    openingBalance = closingBalance - totalInPeriod
    let running = openingBalance
    transactions = rawTxs.map(tx => {
      running += tx.amount
      return { ...tx, balance: running }
    })
  }

  const closingBalance = transactions.length > 0
    ? transactions[transactions.length - 1].balance
    : openingBalance

  // Ageing calculation (based on today vs transaction date)
  const today = new Date()
  const ageing = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  for (const tx of transactions) {
    if (tx.amount <= 0) continue
    const txDate = new Date(tx.date)
    const days = Math.floor((today.getTime() - txDate.getTime()) / 86_400_000)
    if (days <= 30)       ageing.current += tx.amount
    else if (days <= 60)  ageing.days30  += tx.amount
    else if (days <= 90)  ageing.days60  += tx.amount
    else if (days <= 120) ageing.days90  += tx.amount
    else                  ageing.over90  += tx.amount
  }

  return {
    customer: { name: customer.DisplayName, balance: closingBalance },
    period: { start: startDate, end: endDate },
    openingBalance,
    transactions,
    closingBalance,
    ageing,
  }
}
