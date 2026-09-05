'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { downloadUifSchedulePdf, UifScheduleData } from '@/components/uif-schedule-pdf'

function monthLabel(ymd: string) {
  const [y, m] = ymd.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}
function r(n: string) { return `R ${parseFloat(n).toFixed(2)}` }

export default function UifSchedulePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params)
  const [data, setData] = useState<UifScheduleData | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/payroll/${runId}/uif-schedule`).then(r => r.json()).then(setData)
  }, [runId])

  async function handleDownload() {
    if (!data) return
    setDownloading(true)
    try { await downloadUifSchedulePdf(data) } finally { setDownloading(false) }
  }

  if (!data) return <div className="p-8 text-sm text-gray-400">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="print:hidden flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <Link href={`/dashboard/payroll/${runId}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <ArrowLeft size={12} /> Back to run
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload} disabled={downloading}>
            <Download size={14} /> {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none print:max-w-full">
        <div className="px-8 py-6 border-b border-gray-200">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">UIF Monthly Schedule — UI-19</p>
          <h1 className="text-xl font-bold text-gray-900">{data.settings?.name ?? 'Izmaan Property Developments'}</h1>
          {data.settings?.address && <p className="text-xs text-gray-500 mt-1">{data.settings.address}</p>}
          <div className="mt-3 flex gap-8 text-sm">
            <div>
              <p className="text-xs text-gray-400">UIF Reference</p>
              <p className="font-semibold text-gray-800">{data.settings?.uifRef ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pay Period</p>
              <p className="font-semibold text-gray-800">{monthLabel(data.run.periodStart)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Employees</p>
              <p className="font-semibold text-gray-800">{data.employees.length}</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">#</TableHead>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">ID Number</TableHead>
                <TableHead className="text-xs text-right">Gross Remun.</TableHead>
                <TableHead className="text-xs text-right">EE UIF 1%</TableHead>
                <TableHead className="text-xs text-right">ER UIF 1%</TableHead>
                <TableHead className="text-xs text-right">Total UIF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.employees.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-gray-400 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium text-gray-900">{e.name}</TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{e.idNumber ?? '—'}</TableCell>
                  <TableCell className="text-right text-gray-700">{r(e.grossPay)}</TableCell>
                  <TableCell className="text-right text-gray-700">{r(e.uifEmployee)}</TableCell>
                  <TableCell className="text-right text-gray-700">{r(e.uifEmployer)}</TableCell>
                  <TableCell className="text-right text-gray-700">{r(e.totalUif)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="border-t-2 border-gray-900">
                <TableCell colSpan={3} className="text-xs font-bold text-gray-500 uppercase">Total</TableCell>
                <TableCell className="text-right font-bold text-gray-900">{r(data.totals.grossPay)}</TableCell>
                <TableCell className="text-right font-bold text-gray-900">{r(data.totals.uifEmployee)}</TableCell>
                <TableCell className="text-right font-bold text-gray-900">{r(data.totals.uifEmployer)}</TableCell>
                <TableCell className="text-right font-bold text-gray-900">{r(data.totals.totalUif)}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>

        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 leading-5">
          UIF contributions are calculated at 1% employee + 1% employer on gross remuneration, capped at the statutory
          ceiling of R17,712/month (max contribution R177.12 per party). Total payable to SARS by employer: {r(data.totals.totalUif)}.
        </div>
      </div>

      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } }`}</style>
    </div>
  )
}
