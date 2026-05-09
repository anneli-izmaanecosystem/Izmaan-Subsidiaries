'use client'

import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer'
import { CustomerStatement } from '@/lib/qbo'

Font.register({
  family: 'Helvetica',
  fonts: [],
})

const c = {
  primary:   '#111827',
  secondary: '#6b7280',
  border:    '#e5e7eb',
  bg:        '#f9fafb',
  red:       '#dc2626',
  green:     '#16a34a',
}

const s = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, color: c.primary, padding: 40, backgroundColor: '#ffffff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  companyName:  { fontSize: 18, fontWeight: 'bold', color: c.primary },
  docTitle:     { fontSize: 11, color: c.secondary, marginTop: 2 },
  period:       { fontSize: 8, color: c.secondary, marginTop: 2 },
  amountDue:    { alignItems: 'flex-end' },
  amountLabel:  { fontSize: 8, color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountValue:  { fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  divider:      { borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 16 },
  sectionTitle: { fontSize: 8, color: c.secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontWeight: 'bold' },
  tableHeader:  { flexDirection: 'row', backgroundColor: c.bg, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 3, marginBottom: 2 },
  tableRow:     { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  tableRowAlt:  { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: '#fafafa' },
  balanceRow:   { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 6, backgroundColor: c.bg, marginTop: 2, borderRadius: 3 },
  thDate:       { width: '12%', fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thType:       { width: '14%', fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thRef:        { width: '12%', fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thDesc:       { flex: 1,      fontSize: 8, color: c.secondary, fontWeight: 'bold' },
  thAmt:        { width: '13%', fontSize: 8, color: c.secondary, fontWeight: 'bold', textAlign: 'right' },
  thBal:        { width: '14%', fontSize: 8, color: c.secondary, fontWeight: 'bold', textAlign: 'right' },
  tdDate:       { width: '12%', fontSize: 8, color: c.secondary },
  tdType:       { width: '14%', fontSize: 8 },
  tdRef:        { width: '12%', fontSize: 8, color: c.secondary },
  tdDesc:       { flex: 1,      fontSize: 8, color: c.primary },
  tdAmt:        { width: '13%', fontSize: 8, textAlign: 'right' },
  tdBal:        { width: '14%', fontSize: 8, textAlign: 'right', color: c.secondary },
  tdBold:       { fontWeight: 'bold' },
  ageingGrid:   { flexDirection: 'row', gap: 8, marginTop: 8 },
  ageingCard:   { flex: 1, backgroundColor: c.bg, borderRadius: 4, padding: 10 },
  ageingLabel:  { fontSize: 7, color: c.secondary, marginBottom: 4 },
  ageingValue:  { fontSize: 11, fontWeight: 'bold', color: c.primary },
  footer:       { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:   { fontSize: 7, color: c.secondary },
})

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatementDocument({ statement }: { statement: CustomerStatement }) {
  const { customer, period, openingBalance, transactions, closingBalance, ageing } = statement
  const isCredit = closingBalance <= 0

  return (
    <Document title={`Statement — ${customer.name}`} author="Izmaan Ecosystem">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.companyName}>{customer.name}</Text>
            <Text style={s.docTitle}>Account Statement</Text>
            <Text style={s.period}>{fmtDate(period.start)} – {fmtDate(period.end)}</Text>
          </View>
          <View style={s.amountDue}>
            <Text style={s.amountLabel}>Amount Due</Text>
            <Text style={[s.amountValue, { color: isCredit ? c.green : c.red }]}>{fmt(closingBalance)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Transactions */}
        <Text style={s.sectionTitle}>Transactions</Text>
        <View style={s.tableHeader}>
          <Text style={s.thDate}>Date</Text>
          <Text style={s.thType}>Type</Text>
          <Text style={s.thRef}>Ref</Text>
          <Text style={s.thDesc}>Description</Text>
          <Text style={s.thAmt}>Amount</Text>
          <Text style={s.thBal}>Balance</Text>
        </View>

        {/* Opening balance */}
        <View style={s.balanceRow}>
          <Text style={[s.tdDesc, { color: c.secondary }]}>Opening Balance</Text>
          <Text style={[s.tdBal, { marginLeft: 'auto' }]}>{fmt(openingBalance)}</Text>
        </View>

        {transactions.map((tx, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={s.tdDate}>{fmtDate(tx.date)}</Text>
            <Text style={s.tdType}>{tx.type}</Text>
            <Text style={s.tdRef}>{tx.num}</Text>
            <Text style={s.tdDesc}>{tx.memo}</Text>
            <Text style={[s.tdAmt, { color: tx.amount < 0 ? c.green : c.primary }]}>{fmt(tx.amount)}</Text>
            <Text style={s.tdBal}>{fmt(tx.balance)}</Text>
          </View>
        ))}

        {/* Closing balance */}
        <View style={[s.balanceRow, { marginTop: 4 }]}>
          <Text style={[s.tdDesc, s.tdBold]}>Closing Balance</Text>
          <Text style={[s.tdBal, s.tdBold, { marginLeft: 'auto', color: isCredit ? c.green : c.red }]}>{fmt(closingBalance)}</Text>
        </View>

        {/* Ageing */}
        <View style={{ marginTop: 24 }}>
          <View style={s.divider} />
          <Text style={s.sectionTitle}>Ageing Summary</Text>
          <View style={s.ageingGrid}>
            {[
              { label: 'Current (0–30d)', value: ageing.current },
              { label: '31–60 days',      value: ageing.days30  },
              { label: '61–90 days',      value: ageing.days60  },
              { label: '91–120 days',     value: ageing.days90  },
              { label: 'Over 120 days',   value: ageing.over90  },
            ].map(({ label, value }) => (
              <View key={label} style={s.ageingCard}>
                <Text style={s.ageingLabel}>{label}</Text>
                <Text style={[s.ageingValue, { color: value > 0 ? c.primary : c.secondary }]}>{fmt(value)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by Izmaan Ecosystem</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  )
}

export async function downloadStatementPdf(statement: CustomerStatement) {
  const blob = await pdf(<StatementDocument statement={statement} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Statement_${statement.customer.name.replace(/\s+/g, '_')}_${statement.period.start}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
