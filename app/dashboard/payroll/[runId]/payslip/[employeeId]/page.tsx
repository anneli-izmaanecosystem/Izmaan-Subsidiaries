'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Printer, Download, TriangleAlert } from 'lucide-react'
import { downloadPayslipPdf, PayslipData } from '@/components/payslip-pdf'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}
function money(n: string) { return `R ${parseFloat(n).toFixed(2)}` }

export default function PayslipPage({ params }: { params: Promise<{ runId: string; employeeId: string }> }) {
  const { runId, employeeId } = use(params)
  const [data, setData] = useState<PayslipData | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetch(`/api/payroll/${runId}/payslip/${employeeId}`).then(r => r.json()).then(setData)
  }, [runId, employeeId])

  async function handleDownload() {
    if (!data) return
    setDownloading(true)
    try { await downloadPayslipPdf(data) } finally { setDownloading(false) }
  }

  if (!data) return <div className="p-8 text-sm text-gray-400">Loading…</div>

  const { run, settings, employee, entry } = data
  const totalEarnings   = parseFloat(entry.basicSalary) + parseFloat(entry.overtimeAmount) + parseFloat(entry.otherEarnings)
  const totalDeductions = parseFloat(entry.uifEmployee) + parseFloat(entry.paye) + parseFloat(entry.shopDeduction) + parseFloat(entry.otherDeductions)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="print:hidden flex items-center justify-between mb-6 max-w-2xl mx-auto">
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

      <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none print:max-w-full p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Payslip</p>
        <h1 className="text-xl font-bold text-gray-900">{settings?.name ?? 'Izmaan Property Developments'}</h1>
        {settings?.address && <p className="text-xs text-gray-500 mt-1">{settings.address}</p>}
        <p className="text-sm text-gray-600 mt-2">Period End Date: {fmtDate(run.periodEnd)}</p>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-1.5">
            <Row label="Employee Number" value={employee.employeeNumber ?? '—'} />
            <Row label="Employee Name" value={employee.name} />
            <Row label="Known as" value={employee.knownAs ?? '—'} />
            <Row label="ID Number" value={employee.idNumber ?? '—'} />
            <Row label="Date Engaged" value={fmtDate(employee.dateEngaged)} />
          </div>
          <div className="space-y-1.5">
            <Row label="Department" value={employee.department ?? '—'} />
            <Row label="Job Title" value={employee.jobTitle ?? '—'} />
            <Row label="Paypoint" value={employee.paypoint ?? '—'} />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-1.5">
            <Row label="Rate Per Month" value={money(entry.basicSalary)} />
            <Row label="Payment Method" value="EFT" />
          </div>
          <div className="space-y-1.5">
            <Row label="Bank Account" value={`${employee.bankName ?? ''} ${employee.bankAccount ?? '—'}`} />
            <Row label="Branch Code" value={employee.branchCode ?? '—'} />
          </div>
        </div>

        <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Earnings</h3>
        <div className="rounded-lg border border-gray-100 overflow-hidden text-sm">
          <LineRow label="Basic Salary" value={entry.basicSalary} />
          {parseFloat(entry.overtimeAmount) !== 0 && <LineRow label={entry.overtimeLabel || 'Overtime'} value={entry.overtimeAmount} />}
          {parseFloat(entry.otherEarnings) !== 0 && <LineRow label={entry.otherEarningsLabel || 'Other'} value={entry.otherEarnings} />}
          <LineRow label="TOTAL EARNINGS" value={String(totalEarnings)} bold bg />
        </div>

        <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Deductions</h3>
        <div className="rounded-lg border border-gray-100 overflow-hidden text-sm">
          <LineRow label="UIF" value={entry.uifEmployee} />
          <LineRow label="PAYE" value={entry.paye} />
          {parseFloat(entry.shopDeduction) !== 0 && <LineRow label="SHOP" value={entry.shopDeduction} />}
          {parseFloat(entry.otherDeductions) !== 0 && <LineRow label={entry.otherDeductionsLabel || 'Other'} value={entry.otherDeductions} />}
          <LineRow label="TOTAL DEDUCTIONS" value={String(totalDeductions)} bold bg />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3">
          <span className="text-sm font-bold text-white">NET SALARY</span>
          <span className="text-lg font-bold text-white">{money(entry.netPay)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span>Total Company Contributions (UIF – Employer)</span>
          <span className="font-medium text-gray-700">{money(entry.uifEmployer)}</span>
        </div>

        {entry.payeThresholdFlag && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <TriangleAlert size={13} className="shrink-0 mt-0.5" />
            This employee&apos;s annualised gross pay has crossed the SARS PAYE tax threshold — worth confirming PAYE registration.
          </div>
        )}
      </div>

      <style>{`@media print { body { background: white !important; } .print\\:hidden { display: none !important; } }`}</style>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400 text-xs">{label}:</span>
      <span className="font-medium text-gray-800 text-xs">{value}</span>
    </div>
  )
}

function LineRow({ label, value, bold, bg }: { label: string; value: string; bold?: boolean; bg?: boolean }) {
  return (
    <div className={`flex justify-between px-3 py-2 ${bg ? 'bg-gray-50' : 'border-b border-gray-100 last:border-0'} ${bold ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
      <span>{label}</span>
      <span>{money(value)}</span>
    </div>
  )
}
