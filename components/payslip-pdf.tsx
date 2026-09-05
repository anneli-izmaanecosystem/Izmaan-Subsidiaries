'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

type Settings = { name: string; address: string | null } | null
type Run = { periodStart: string; periodEnd: string }
type Employee = {
  employeeNumber: string | null; name: string; knownAs: string | null; idNumber: string | null
  department: string | null; jobTitle: string | null; paypoint: string | null; dateEngaged: string | null
  bankName: string | null; bankAccount: string | null; branchCode: string | null
}
type Entry = {
  basicSalary: string; overtimeAmount: string; overtimeLabel: string | null
  otherEarnings: string; otherEarningsLabel: string | null
  uifEmployee: string; uifEmployer: string; paye: string; shopDeduction: string
  otherDeductions: string; otherDeductionsLabel: string | null
  grossPay: string; netPay: string; payeThresholdFlag: boolean
}

export type PayslipData = { run: Run; settings: Settings; employee: Employee; entry: Entry }

const c = { primary: '#111827', secondary: '#6b7280', border: '#e5e7eb', bg: '#f9fafb' }

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, color: c.primary, padding: 40, backgroundColor: '#ffffff' },
  kicker:      { fontSize: 8, color: c.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: c.primary },
  address:     { fontSize: 8, color: c.secondary, marginTop: 2 },
  period:      { fontSize: 9, color: c.secondary, marginTop: 4 },
  divider:     { borderBottomWidth: 1, borderBottomColor: c.border, marginVertical: 12 },
  grid:        { flexDirection: 'row', gap: 24 },
  col:         { flex: 1 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label:       { fontSize: 8, color: c.secondary },
  value:       { fontSize: 9, fontWeight: 'bold' },
  sectionTitle:{ fontSize: 8, color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 4, fontWeight: 'bold' },
  tableHeader: { flexDirection: 'row', backgroundColor: c.bg, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  th:          { flex: 1, fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thAmt:       { width: '30%', fontSize: 8, color: c.secondary, fontWeight: 'bold', textAlign: 'right' },
  td:          { flex: 1, fontSize: 8.5 },
  tdAmt:       { width: '30%', fontSize: 8.5, textAlign: 'right' },
  totalRow:    { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: c.bg, marginTop: 2, borderRadius: 3, justifyContent: 'space-between' },
  netRow:      { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 6, backgroundColor: '#111827', marginTop: 8, borderRadius: 3, justifyContent: 'space-between' },
  netLabel:    { fontSize: 9, color: '#ffffff', fontWeight: 'bold' },
  netValue:    { fontSize: 11, color: '#ffffff', fontWeight: 'bold' },
  footer:      { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7, color: c.secondary },
})

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function money(n: string) { return `R ${parseFloat(n).toFixed(2)}` }

function PayslipDocument({ data }: { data: PayslipData }) {
  const { run, settings, employee, entry } = data
  const totalEarnings   = parseFloat(entry.basicSalary) + parseFloat(entry.overtimeAmount) + parseFloat(entry.otherEarnings)
  const totalDeductions = parseFloat(entry.uifEmployee) + parseFloat(entry.paye) + parseFloat(entry.shopDeduction) + parseFloat(entry.otherDeductions)

  return (
    <Document title={`Payslip — ${employee.name}`} author="Izmaan Ecosystem">
      <Page size="A4" style={s.page}>
        <Text style={s.kicker}>Payslip</Text>
        <Text style={s.companyName}>{settings?.name ?? 'Izmaan Property Developments'}</Text>
        {settings?.address && <Text style={s.address}>{settings.address}</Text>}
        <Text style={s.period}>Period End Date: {fmtDate(run.periodEnd)}</Text>

        <View style={s.divider} />

        <View style={s.grid}>
          <View style={s.col}>
            <View style={s.row}><Text style={s.label}>Employee Number:</Text><Text style={s.value}>{employee.employeeNumber ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>Employee Name:</Text><Text style={s.value}>{employee.name}</Text></View>
            <View style={s.row}><Text style={s.label}>Known as:</Text><Text style={s.value}>{employee.knownAs ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>ID Number:</Text><Text style={s.value}>{employee.idNumber ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>Date Engaged:</Text><Text style={s.value}>{fmtDate(employee.dateEngaged)}</Text></View>
          </View>
          <View style={s.col}>
            <View style={s.row}><Text style={s.label}>Department:</Text><Text style={s.value}>{employee.department ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>Job Title:</Text><Text style={s.value}>{employee.jobTitle ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>Paypoint:</Text><Text style={s.value}>{employee.paypoint ?? '—'}</Text></View>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.grid}>
          <View style={s.col}>
            <View style={s.row}><Text style={s.label}>Rate Per Month:</Text><Text style={s.value}>{money(entry.basicSalary)}</Text></View>
            <View style={s.row}><Text style={s.label}>Payment Method:</Text><Text style={s.value}>EFT</Text></View>
          </View>
          <View style={s.col}>
            <View style={s.row}><Text style={s.label}>Bank Account:</Text><Text style={s.value}>{employee.bankName ?? ''} {employee.bankAccount ?? '—'}</Text></View>
            <View style={s.row}><Text style={s.label}>Branch Code:</Text><Text style={s.value}>{employee.branchCode ?? '—'}</Text></View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Earnings</Text>
        <View style={s.tableHeader}>
          <Text style={s.th}>Description</Text>
          <Text style={s.thAmt}>Amount</Text>
        </View>
        <View style={s.tableRow}><Text style={s.td}>Basic Salary</Text><Text style={s.tdAmt}>{money(entry.basicSalary)}</Text></View>
        {parseFloat(entry.overtimeAmount) !== 0 && (
          <View style={s.tableRow}><Text style={s.td}>{entry.overtimeLabel || 'Overtime'}</Text><Text style={s.tdAmt}>{money(entry.overtimeAmount)}</Text></View>
        )}
        {parseFloat(entry.otherEarnings) !== 0 && (
          <View style={s.tableRow}><Text style={s.td}>{entry.otherEarningsLabel || 'Other'}</Text><Text style={s.tdAmt}>{money(entry.otherEarnings)}</Text></View>
        )}
        <View style={s.totalRow}>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>TOTAL EARNINGS</Text>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>{money(String(totalEarnings))}</Text>
        </View>

        <Text style={s.sectionTitle}>Deductions</Text>
        <View style={s.tableHeader}>
          <Text style={s.th}>Description</Text>
          <Text style={s.thAmt}>Amount</Text>
        </View>
        <View style={s.tableRow}><Text style={s.td}>UIF</Text><Text style={s.tdAmt}>{money(entry.uifEmployee)}</Text></View>
        <View style={s.tableRow}><Text style={s.td}>PAYE</Text><Text style={s.tdAmt}>{money(entry.paye)}</Text></View>
        {parseFloat(entry.shopDeduction) !== 0 && (
          <View style={s.tableRow}><Text style={s.td}>SHOP</Text><Text style={s.tdAmt}>{money(entry.shopDeduction)}</Text></View>
        )}
        {parseFloat(entry.otherDeductions) !== 0 && (
          <View style={s.tableRow}><Text style={s.td}>{entry.otherDeductionsLabel || 'Other'}</Text><Text style={s.tdAmt}>{money(entry.otherDeductions)}</Text></View>
        )}
        <View style={s.totalRow}>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>TOTAL DEDUCTIONS</Text>
          <Text style={{ fontSize: 8.5, fontWeight: 'bold' }}>{money(String(totalDeductions))}</Text>
        </View>

        <View style={s.netRow}>
          <Text style={s.netLabel}>NET SALARY</Text>
          <Text style={s.netValue}>{money(entry.netPay)}</Text>
        </View>

        <View style={[s.row, { marginTop: 12 }]}>
          <Text style={s.label}>Total Company Contributions (UIF – Employer):</Text>
          <Text style={s.value}>{money(entry.uifEmployer)}</Text>
        </View>

        {entry.payeThresholdFlag && (
          <Text style={{ fontSize: 7.5, color: '#b45309', marginTop: 10 }}>
            Note: this employee&apos;s annualised gross pay has crossed the SARS PAYE tax threshold — worth confirming PAYE registration.
          </Text>
        )}

        <View style={s.footer} fixed>
          <Text>Generated by Izmaan Ecosystem</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadPayslipPdf(data: PayslipData) {
  const blob = await pdf(<PayslipDocument data={data} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Payslip_${data.employee.name.replace(/\s+/g, '_')}_${data.run.periodStart.slice(0, 7)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
