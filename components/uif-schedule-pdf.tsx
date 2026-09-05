'use client'

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'

type Employee = { name: string; idNumber: string | null; grossPay: string; uifEmployee: string; uifEmployer: string; totalUif: string }
type Totals = { grossPay: string; uifEmployee: string; uifEmployer: string; totalUif: string }
type Settings = { name: string; address: string | null; uifRef: string | null } | null
type Run = { periodStart: string; periodEnd: string }

export type UifScheduleData = { run: Run; settings: Settings; employees: Employee[]; totals: Totals }

const c = { primary: '#111827', secondary: '#6b7280', border: '#e5e7eb', bg: '#f9fafb' }

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 9, color: c.primary, padding: 40, backgroundColor: '#ffffff' },
  kicker:      { fontSize: 8, color: c.secondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  companyName: { fontSize: 16, fontWeight: 'bold', color: c.primary },
  address:     { fontSize: 8, color: c.secondary, marginTop: 2 },
  metaRow:     { flexDirection: 'row', gap: 32, marginTop: 16, marginBottom: 16 },
  metaLabel:   { fontSize: 7, color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue:   { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  divider:     { borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: c.bg, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginBottom: 2 },
  tableRow:    { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  totalRow:    { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: c.bg, marginTop: 2, borderRadius: 3 },
  thNum:       { width: '6%',  fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thName:      { width: '28%', fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thId:        { width: '20%', fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thAmt:       { width: '15.5%', fontSize: 8, color: c.secondary, fontWeight: 'bold', textAlign: 'right' },
  tdNum:       { width: '6%',  fontSize: 8, color: c.secondary },
  tdName:      { width: '28%', fontSize: 8 },
  tdId:        { width: '20%', fontSize: 8, color: c.secondary },
  tdAmt:       { width: '15.5%', fontSize: 8, textAlign: 'right' },
  footer:      { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 7, color: c.secondary },
})

function monthLabel(ymd: string) {
  const [y, m] = ymd.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

function UifScheduleDocument({ data }: { data: UifScheduleData }) {
  const { run, settings, employees, totals } = data
  return (
    <Document title={`UIF Monthly Schedule — ${monthLabel(run.periodStart)}`} author="Izmaan Ecosystem">
      <Page size="A4" style={s.page}>
        <Text style={s.kicker}>UIF Monthly Schedule — UI-19</Text>
        <Text style={s.companyName}>{settings?.name ?? 'Izmaan Property Developments'}</Text>
        {settings?.address && <Text style={s.address}>{settings.address}</Text>}

        <View style={s.metaRow}>
          <View>
            <Text style={s.metaLabel}>UIF Reference</Text>
            <Text style={s.metaValue}>{settings?.uifRef ?? '—'}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Pay Period</Text>
            <Text style={s.metaValue}>{monthLabel(run.periodStart)}</Text>
          </View>
          <View>
            <Text style={s.metaLabel}>Employees</Text>
            <Text style={s.metaValue}>{employees.length}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.tableHeader}>
          <Text style={s.thNum}>#</Text>
          <Text style={s.thName}>Employee</Text>
          <Text style={s.thId}>ID Number</Text>
          <Text style={s.thAmt}>Gross Remun.</Text>
          <Text style={s.thAmt}>EE UIF 1%</Text>
          <Text style={s.thAmt}>ER UIF 1%</Text>
          <Text style={s.thAmt}>Total UIF</Text>
        </View>
        {employees.map((e, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={s.tdNum}>{i + 1}</Text>
            <Text style={s.tdName}>{e.name}</Text>
            <Text style={s.tdId}>{e.idNumber ?? '—'}</Text>
            <Text style={s.tdAmt}>R {parseFloat(e.grossPay).toFixed(2)}</Text>
            <Text style={s.tdAmt}>R {parseFloat(e.uifEmployee).toFixed(2)}</Text>
            <Text style={s.tdAmt}>R {parseFloat(e.uifEmployer).toFixed(2)}</Text>
            <Text style={s.tdAmt}>R {parseFloat(e.totalUif).toFixed(2)}</Text>
          </View>
        ))}
        <View style={[s.totalRow, { marginTop: 4 }]}>
          <Text style={[s.tdName, { fontWeight: 'bold' }, { width: '54%' }]}>TOTAL</Text>
          <Text style={[s.tdAmt, { fontWeight: 'bold' }]}>R {parseFloat(totals.grossPay).toFixed(2)}</Text>
          <Text style={[s.tdAmt, { fontWeight: 'bold' }]}>R {parseFloat(totals.uifEmployee).toFixed(2)}</Text>
          <Text style={[s.tdAmt, { fontWeight: 'bold' }]}>R {parseFloat(totals.uifEmployer).toFixed(2)}</Text>
          <Text style={[s.tdAmt, { fontWeight: 'bold' }]}>R {parseFloat(totals.totalUif).toFixed(2)}</Text>
        </View>

        <Text style={{ fontSize: 7, color: c.secondary, marginTop: 16 }}>
          UIF contributions are calculated at 1% employee + 1% employer on gross remuneration, capped at the statutory
          ceiling of R17,712/month (max contribution R177.12 per party). Total payable to SARS by employer: R {parseFloat(totals.totalUif).toFixed(2)}.
        </Text>

        <View style={s.footer} fixed>
          <Text>Generated by Izmaan Ecosystem — cross-check against your actual UIF u-Filing submission before relying on this for a return.</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadUifSchedulePdf(data: UifScheduleData) {
  const blob = await pdf(<UifScheduleDocument data={data} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `UI19_${data.run.periodStart.slice(0, 7)}_Schedule_Izmaan.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
