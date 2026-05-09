'use client'

import { useState } from 'react'
import { CustomerStatement } from '@/lib/qbo'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadStatementPdf } from '@/components/statement-pdf'

function fmt(n: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)
}

function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function StatementViewer({ statement }: { statement: CustomerStatement }) {
  const { customer, period, openingBalance, transactions, closingBalance, ageing } = statement
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try { await downloadStatementPdf(statement) } finally { setDownloading(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between p-8 pb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Statement period: {fmtDate(period.start)} – {fmtDate(period.end)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer size={14} />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="gap-2">
            <Download size={14} />
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Amount Due</p>
            <p className={`text-2xl font-bold ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fmt(closingBalance)}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Transactions */}
      <div className="p-8 py-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Transactions</h3>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Reference</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening balance row */}
            <TableRow className="bg-gray-50/50">
              <TableCell className="text-xs text-gray-400" colSpan={4}>Opening Balance</TableCell>
              <TableCell />
              <TableCell className="text-xs font-medium text-right">{fmt(openingBalance)}</TableCell>
            </TableRow>

            {transactions.map((tx, i) => (
              <TableRow key={i} className="text-sm">
                <TableCell className="text-gray-600 whitespace-nowrap">{fmtDate(tx.date)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-normal">{tx.type}</Badge>
                </TableCell>
                <TableCell className="text-gray-500 font-mono text-xs">{tx.num}</TableCell>
                <TableCell className="text-gray-700 max-w-xs truncate">{tx.memo}</TableCell>
                <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                  {fmt(tx.amount)}
                </TableCell>
                <TableCell className="text-right text-gray-700">{fmt(tx.balance)}</TableCell>
              </TableRow>
            ))}

            {/* Closing balance row */}
            <TableRow className="bg-gray-50/50 font-semibold">
              <TableCell colSpan={4} className="text-sm">Closing Balance</TableCell>
              <TableCell />
              <TableCell className={`text-right text-sm ${closingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(closingBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* Ageing summary */}
      <div className="p-8 pt-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Ageing Summary</h3>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Current (0–30d)', value: ageing.current },
            { label: '31–60 days',      value: ageing.days30  },
            { label: '61–90 days',      value: ageing.days60  },
            { label: '91–120 days',     value: ageing.days90  },
            { label: 'Over 120 days',   value: ageing.over90  },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs text-gray-400">{label}</p>
              <p className={`mt-1 text-base font-semibold ${value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {fmt(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
