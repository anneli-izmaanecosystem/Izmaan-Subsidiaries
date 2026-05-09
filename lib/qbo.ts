import { redis } from './redis'

const TOKEN_KEY    = 'qbo:tokens'
const CLIENT_ID    = process.env.QBO_CLIENT_ID!
const CLIENT_SECRET = process.env.QBO_CLIENT_SECRET!
const REDIRECT_URI = process.env.QBO_REDIRECT_URI!
const TOKEN_URL    = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const BASE_URL     = 'https://quickbooks.api.intuit.com/v3/company'

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
  const val = await redis.getdel(`${STATE_PREFIX}${state}`)
  return val === '1'
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function basicAuth() {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
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
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  })}`
}

export async function exchangeCode(code: string, realmId: string): Promise<QBOTokens> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: basicAuth(), 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
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

function parseReportRows(report: any): Transaction[] {
  const columns: string[] = report.Columns?.Column?.map((c: any) => c.ColTitle ?? c.ColType) ?? []
  const rows: Transaction[] = []

  function walk(rowArray: any[]) {
    for (const row of rowArray) {
      if (row.type === 'Data' && row.ColData) {
        const vals = row.ColData.map((c: any) => c.value ?? '')
        const idx = (title: string) => columns.findIndex(c => c.toLowerCase().includes(title.toLowerCase()))
        rows.push({
          date:    vals[idx('date')]    ?? '',
          type:    vals[idx('type')]    ?? '',
          num:     vals[idx('num')]     ?? '',
          memo:    vals[idx('memo')]    ?? vals[idx('name')] ?? '',
          amount:  parseFloat(vals[idx('amount')] ?? '0') || 0,
          balance: parseFloat(vals[idx('balance')] ?? '0') || 0,
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

  // Fetch transactions using the server-resolved DisplayName, not user input
  const report = await qboGet('reports/TransactionList', {
    start_date: startDate,
    end_date:   endDate,
    customer:   customer.DisplayName,
    columns:    'tx_date,txn_type,doc_num,name,memo,amount,balance',
  })

  const transactions = parseReportRows(report)

  // Ageing calculation (based on today vs transaction date)
  const today = new Date()
  const ageing = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 }
  for (const tx of transactions) {
    if (tx.amount <= 0) continue // only charges age
    const txDate = new Date(tx.date)
    const days = Math.floor((today.getTime() - txDate.getTime()) / 86_400_000)
    if (days <= 30)      ageing.current += tx.amount
    else if (days <= 60) ageing.days30  += tx.amount
    else if (days <= 90) ageing.days60  += tx.amount
    else if (days <= 120) ageing.days90 += tx.amount
    else                  ageing.over90 += tx.amount
  }

  const openingBalance = transactions.length > 0 ? transactions[0].balance - transactions[0].amount : 0
  const closingBalance = customer.Balance ?? 0

  return {
    customer: { name: customer.DisplayName, balance: closingBalance },
    period: { start: startDate, end: endDate },
    openingBalance,
    transactions,
    closingBalance,
    ageing,
  }
}
