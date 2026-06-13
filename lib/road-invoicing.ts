// Road Invoicing Processor
// Converts ATG gate scan CSV + Trevor's WhatsApp cash list into QBO-ready invoice CSV

// ─── Rates ────────────────────────────────────────────────────────────────────

export const VEHICLE_RATES: Record<string, number> = {
  '2A Bakkie Full':             1000,
  '2B Bakkie Half Load':         500,
  '3A Truck (3 Ton) Full':      1500,
  '4A Truck HMV (>3 Ton) Full': 2000,
  'NO LOAD':                      80,
  '1 Small Bakkie':              750,
  '2 Small Car':                 300,
}

// Account holder names (lowercase key) that override the standard rate
export const ACCOUNT_RATE_OVERRIDES: Record<string, { rate: number; item: string }> = {
  manda: { rate: 900, item: 'Manda Fixed Rate' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ATGRow {
  type: 'in' | 'out'
  license: string
  name: string
  customFields: string
  connectedCustomFields: string
  creationDate: string
  connectedEntranceExit: string
  duration: string
}

export interface ParsedFields {
  cellNumber: string
  driverName: string
  accountHolderName: string
  vehicleType: string
  trailer: boolean
  licenseType: string
  driversLicenseScan: string
}

export interface CashEntry {
  raw: string
  norm: string   // spaces stripped, uppercase — used for plate matching
  amount: number
  date: string
}

export interface InvoiceRow {
  invoiceNo: string
  customer: string
  invoiceDate: string
  terms: string
  item: string
  qty: number
  rate: number
  amount: number
  taxCode: string
  serviceDate: string
  description: string
  phone: string
  licence: string
  driver: string
  inDateTime: string
  outDateTime: string
  tripType: string
  notes: string
}

export interface CustomerRecord {
  name: string
  phone: string
  plates: string[]
  tripCount: number
}

// ─── CSV Parser (handles quoted fields) ──────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (ch === ',' && !inQ) {
      cols.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  cols.push(cur)
  return cols
}

export function parseATGCSV(text: string): ATGRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const rows: ATGRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i])
    rows.push({
      type:                  ((c[0] ?? '').trim().toLowerCase()) as 'in' | 'out',
      license:               (c[1] ?? '').trim().toUpperCase(),
      name:                  (c[2] ?? '').trim(),
      customFields:          (c[4] ?? '').trim(),
      connectedCustomFields: (c[5] ?? '').trim(),
      creationDate:          (c[6] ?? '').trim(),
      connectedEntranceExit: (c[7] ?? '').trim(),
      duration:              (c[8] ?? '').trim(),
    })
  }
  return rows
}

// ─── Custom Fields Parser ─────────────────────────────────────────────────────
// Format: "Cell Number: 0824518956, Driver Name Surname: shingiri, ..."

export function parseCustomFields(raw: string): ParsedFields {
  const r: ParsedFields = {
    cellNumber: '', driverName: '', accountHolderName: '',
    vehicleType: '', trailer: false, licenseType: '', driversLicenseScan: '',
  }
  if (!raw) return r
  for (const pair of raw.split(', ')) {
    const idx = pair.indexOf(': ')
    if (idx === -1) continue
    const key = pair.slice(0, idx).trim().toLowerCase()
    const val = pair.slice(idx + 2).trim()
    if (key === 'cell number')          r.cellNumber = val
    else if (key === 'driver name surname') r.driverName = val
    else if (key === 'account holder name') r.accountHolderName = val
    else if (key === 'vehicle type')    r.vehicleType = val
    else if (key === 'trailer')         r.trailer = val.toLowerCase() === 'yes'
    else if (key === 'type of license') r.licenseType = val
    else if (key === 'drivers license scan') r.driversLicenseScan = val
  }
  return r
}

// ─── Customer Name Resolution ─────────────────────────────────────────────────
// Priority: Account Holder → Driver Name → RSA scan → CSV Name column → Plate

function titleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())
}

function resolveCustomer(f: ParsedFields, csvName: string, license: string): string {
  const acct = f.accountHolderName.replace(/^\d+\s+/, '').trim()
  if (acct && !acct.toUpperCase().includes('NO ACCOUNT')) return titleCase(acct)
  if (f.driverName)         return titleCase(f.driverName)
  if (f.driversLicenseScan) return titleCase(f.driversLicenseScan)
  if (csvName)              return titleCase(csvName)
  return license
}

// ─── Rate Resolution ──────────────────────────────────────────────────────────

function resolveRate(f: ParsedFields, customer: string): { rate: number; item: string } {
  for (const [key, override] of Object.entries(ACCOUNT_RATE_OVERRIDES)) {
    if (customer.toLowerCase().includes(key)) return override
  }
  const rate = VEHICLE_RATES[f.vehicleType]
  return rate !== undefined ? { rate, item: f.vehicleType } : { rate: 1000, item: f.vehicleType || 'Unknown' }
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────
// ATG format: "HH:MM DD/MM/YYYY"

function parseATGDate(raw: string) {
  if (!raw) return { datetime: '', qboDate: '', saDate: '' }
  const m = raw.match(/^(\d{2}:\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return { datetime: raw, qboDate: '', saDate: '' }
  const [, time, dd, mm, yyyy] = m
  return {
    datetime: `${dd}/${mm}/${yyyy} ${time}`,
    qboDate:  `${mm}/${dd}/${yyyy}`,  // QBO uses MM/DD/YYYY
    saDate:   `${dd}/${mm}/${yyyy}`,
  }
}

// ─── WhatsApp Cash List Parser ────────────────────────────────────────────────
// Lines: "DRIVER PLATE-RAMOUNT" — plate has spaces, suffix often omitted

export function parseCashList(text: string): CashEntry[] {
  const entries: CashEntry[] = []
  let currentDate = ''
  for (const rawLine of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    // Detect date header: e.g. "7 June 2026" possibly followed by first trip
    const dateMatch = line.match(/^(\d{1,2}\s+\w+\s+\d{4})\s*(.*)$/)
    if (dateMatch) {
      currentDate = dateMatch[1]
      const rest = dateMatch[2].trim()
      if (rest) parseTripLine(rest, currentDate, entries)
      continue
    }

    if (line.match(/-\s*R/i)) parseTripLine(line, currentDate, entries)
  }
  return entries
}

function parseTripLine(line: string, date: string, out: CashEntry[]) {
  const cleaned = line.replace(/^\s*-\s*/, '').trim()
  const idx = cleaned.search(/-\s*R/i)
  if (idx === -1) return
  const driverPlate = cleaned.slice(0, idx).trim()
  const amountStr   = cleaned.slice(idx + 1).replace(/R/i, '').trim()
  const amount      = parseInt(amountStr.replace(/\D/g, ''), 10)
  if (!amount || !driverPlate) return
  // Normalize: remove spaces and dashes, uppercase
  const norm = driverPlate.replace(/[\s\-]/g, '').toUpperCase()
  out.push({ raw: cleaned, norm, amount, date })
}

// ─── Plate Matching ───────────────────────────────────────────────────────────
// Strategy: strip suffix (trailing alpha) from ATG plate, check if it's a
// substring of the normalized WhatsApp driver+plate string.
// e.g. ATG "HDC898L" → stripped "HDC898"; WhatsApp norm "TAWASHDC898" → match ✓

function stripSuffix(p: string): string {
  return p.replace(/[A-Z]+$/, '')
}

function matchCash(license: string, entries: CashEntry[], used: Set<CashEntry>): CashEntry | null {
  const norm    = license.replace(/\s/g, '').toUpperCase()
  const stripped = stripSuffix(norm)
  if (stripped.length < 4) return null
  for (const e of entries) {
    if (!used.has(e) && e.norm.includes(stripped)) return e
  }
  return null
}

// ─── Main Processor ───────────────────────────────────────────────────────────

export function processATG(atgRows: ATGRow[], cashEntries: CashEntry[]): {
  invoices:  InvoiceRow[]
  customers: CustomerRecord[]
  unmatched: CashEntry[]
} {
  const invoices:  InvoiceRow[]    = []
  const custMap  = new Map<string, CustomerRecord>()
  const used     = new Set<CashEntry>()

  for (const row of atgRows.filter(r => r.type === 'in')) {
    const f        = parseCustomFields(row.customFields)
    const customer = resolveCustomer(f, row.name, row.license)
    const { rate, item } = resolveRate(f, customer)
    const inDate   = parseATGDate(row.creationDate)
    const outDT    = row.connectedEntranceExit
      ? parseATGDate(row.connectedEntranceExit).datetime
      : ''
    const tripType = outDT ? 'Full Trip' : 'Single Trip'

    // Cash matching
    const cash = matchCash(row.license, cashEntries, used)
    let invoiceNo = ''
    let amount = rate
    let notes = ''

    if (cash) {
      used.add(cash)
      invoiceNo = 'Cash'
      amount    = cash.amount
      if (cash.amount === rate) {
        notes = `💵 Cash R${amount} confirmed.`
      } else if (cash.amount < rate) {
        notes = `💵 Cash R${cash.amount} paid. Rate R${rate}. ⚠ Shortfall R${rate - cash.amount}.`
      } else {
        notes = `💵 Cash R${cash.amount} paid. Rate R${rate}. 💰 Overpayment R${cash.amount - rate}.`
      }
    } else {
      notes = '❌ No cash match — invoice outstanding.'
    }
    if (!outDT) notes += ' ℹ No OUT scan recorded.'

    const driverDesc = f.driverName || f.driversLicenseScan || row.name
    const description = [
      row.license,
      driverDesc.toLowerCase(),
      `IN: ${inDate.datetime}`,
      outDT ? `OUT: ${outDT}` : null,
    ].filter(Boolean).join(' | ')

    invoices.push({
      invoiceNo, customer,
      invoiceDate: inDate.qboDate, terms: 'Due on receipt',
      item, qty: 1, rate, amount, taxCode: 'EX',
      serviceDate: inDate.qboDate, description,
      phone:       f.cellNumber,
      licence:     row.license,
      driver:      titleCase(driverDesc),
      inDateTime:  inDate.datetime,
      outDateTime: outDT,
      tripType,    notes,
    })

    // Customer deduplication
    const key = customer.toLowerCase()
    if (!custMap.has(key)) custMap.set(key, { name: customer, phone: '', plates: [], tripCount: 0 })
    const c = custMap.get(key)!
    c.tripCount++
    if (f.cellNumber && !c.phone) c.phone = f.cellNumber
    if (!c.plates.includes(row.license)) c.plates.push(row.license)
  }

  return {
    invoices,
    customers:  Array.from(custMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    unmatched:  cashEntries.filter(e => !used.has(e)),
  }
}

// ─── CSV Output ───────────────────────────────────────────────────────────────

function cell(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function invoicesToCSV(rows: InvoiceRow[]): string {
  const hdr = [
    'InvoiceNo','Customer','InvoiceDate','Terms','Item','Qty','Rate','Amount',
    'TaxCode','ServiceDate','Description','Phone','',
    'Licence','Driver','IN DateTime','OUT DateTime','Trip Type','Notes / Flags',
  ]
  const data = rows.map(r => [
    r.invoiceNo, r.customer, r.invoiceDate, r.terms, r.item,
    r.qty, r.rate, r.amount, r.taxCode, r.serviceDate,
    r.description, r.phone, '',
    r.licence, r.driver, r.inDateTime, r.outDateTime, r.tripType, r.notes,
  ])
  return [hdr, ...data].map(row => row.map(cell).join(',')).join('\n')
}

export function customersToCSV(customers: CustomerRecord[]): string {
  const hdr = ['Customer','Phone','Plates','Trip Count']
  const data = customers.map(c => [c.name, c.phone, c.plates.join(' | '), c.tripCount])
  return [hdr, ...data].map(row => row.map(cell).join(',')).join('\n')
}
