'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Save, Lock, LockOpen, FileText, ClipboardList, TriangleAlert } from 'lucide-react'

type Employee = { id: number; name: string; knownAs: string | null; idNumber: string | null }
type Entry = {
  basicSalary: string; overtimeAmount: string; overtimeLabel: string | null
  otherEarnings: string; otherEarningsLabel: string | null
  paye: string; shopDeduction: string; otherDeductions: string
  uifEmployee: string; uifEmployer: string; grossPay: string; netPay: string
  payeThresholdFlag: boolean
}
type Row = { entry: Entry; employee: Employee }
type Run = { id: number; periodStart: string; periodEnd: string; status: 'draft' | 'finalised' }

function monthLabel(ymd: string) {
  const [y, m] = ymd.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}
function r(n: string) { return `R ${parseFloat(n).toFixed(2)}` }

export default function PayrollRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params)
  const [run, setRun] = useState<Run | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [draft, setDraft] = useState<Record<number, Partial<Entry>>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)

  async function reload() {
    const res = await fetch(`/api/payroll/${runId}`)
    const data = await res.json()
    setRun(data.run)
    setRows(data.entries)
  }

  useEffect(() => {
    fetch(`/api/payroll/${runId}`)
      .then(res => res.json())
      .then(data => { setRun(data.run); setRows(data.entries) })
      .finally(() => setLoading(false))
  }, [runId])

  function field(employeeId: number, entry: Entry, key: keyof Entry) {
    return draft[employeeId]?.[key] ?? entry[key]
  }
  function setField(employeeId: number, key: keyof Entry, value: string) {
    setDraft(d => ({ ...d, [employeeId]: { ...d[employeeId], [key]: value } }))
  }

  async function saveRow(employeeId: number, entry: Entry) {
    setSavingId(employeeId)
    const merged = { ...entry, ...draft[employeeId] }
    const res = await fetch(`/api/payroll/${runId}/entries/${employeeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    if (res.ok) {
      setDraft(d => { const next = { ...d }; delete next[employeeId]; return next })
      await reload()
    }
    setSavingId(null)
  }

  async function toggleFinalise() {
    if (!run) return
    await fetch(`/api/payroll/${runId}/${run.status === 'finalised' ? 'reopen' : 'finalise'}`, { method: 'POST' })
    await reload()
  }

  const isFinalised = run?.status === 'finalised'
  const totals = rows.reduce((acc, row) => ({
    gross: acc.gross + parseFloat(row.entry.grossPay),
    net:   acc.net   + parseFloat(row.entry.netPay),
  }), { gross: 0, net: 0 })

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/payroll" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1">
            <ArrowLeft size={12} /> Payroll
          </Link>
          {loading ? <Skeleton className="h-6 w-48" /> : (
            <h1 className="text-xl font-semibold text-gray-900">{run && monthLabel(run.periodStart)}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/payroll/${runId}/uif-schedule`}>
            <Button variant="outline" size="sm" className="gap-2"><FileText size={14} /> UIF Schedule</Button>
          </Link>
          {run && (
            <Button size="sm" variant={isFinalised ? 'outline' : 'default'} className="gap-2" onClick={toggleFinalise}>
              {isFinalised ? <><LockOpen size={14} /> Reopen</> : <><Lock size={14} /> Finalise</>}
            </Button>
          )}
        </div>
      </div>

      {run && (
        <Badge variant={isFinalised ? 'default' : 'outline'} className="w-fit text-xs font-normal">
          {run.status}
        </Badge>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No employees on this run.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs text-right">Basic</TableHead>
                <TableHead className="text-xs text-right">Overtime</TableHead>
                <TableHead className="text-xs text-right">Other +</TableHead>
                <TableHead className="text-xs text-right">Gross</TableHead>
                <TableHead className="text-xs text-right">UIF (Ee)</TableHead>
                <TableHead className="text-xs text-right">PAYE</TableHead>
                <TableHead className="text-xs text-right">SHOP</TableHead>
                <TableHead className="text-xs text-right">Other -</TableHead>
                <TableHead className="text-xs text-right">Net Pay</TableHead>
                <TableHead className="text-xs text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ entry, employee }) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium text-gray-900">
                    <div className="flex items-center gap-1.5">
                      {employee.knownAs ?? employee.name}
                      {entry.payeThresholdFlag && (
                        <TriangleAlert size={13} className="text-amber-500" strokeWidth={2.2} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-24 ml-auto text-right" value={field(employee.id, entry, 'basicSalary') as string}
                      onChange={e => setField(employee.id, 'basicSalary', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-24 ml-auto text-right" value={field(employee.id, entry, 'overtimeAmount') as string}
                      onChange={e => setField(employee.id, 'overtimeAmount', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-24 ml-auto text-right" value={field(employee.id, entry, 'otherEarnings') as string}
                      onChange={e => setField(employee.id, 'otherEarnings', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right text-gray-700">{r(entry.grossPay)}</TableCell>
                  <TableCell className="text-right text-gray-500">{r(entry.uifEmployee)}</TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-20 ml-auto text-right" value={field(employee.id, entry, 'paye') as string}
                      onChange={e => setField(employee.id, 'paye', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-20 ml-auto text-right" value={field(employee.id, entry, 'shopDeduction') as string}
                      onChange={e => setField(employee.id, 'shopDeduction', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input disabled={isFinalised} className="w-20 ml-auto text-right" value={field(employee.id, entry, 'otherDeductions') as string}
                      onChange={e => setField(employee.id, 'otherDeductions', e.target.value)} />
                  </TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">{r(entry.netPay)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {!isFinalised && (
                      <Button size="icon-sm" variant="ghost" disabled={savingId === employee.id}
                        onClick={() => saveRow(employee.id, entry)} title="Save">
                        <Save size={14} />
                      </Button>
                    )}
                    <Link href={`/dashboard/payroll/${runId}/payslip/${employee.id}`}>
                      <Button size="icon-sm" variant="ghost" title="Payslip"><ClipboardList size={14} /></Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="border-t-2 border-gray-900">
                <TableCell colSpan={4} className="text-xs font-bold text-gray-500 uppercase">Total</TableCell>
                <TableCell className="text-right font-bold text-gray-900">{r(String(totals.gross))}</TableCell>
                <TableCell colSpan={4} />
                <TableCell className="text-right font-bold text-gray-900">{r(String(totals.net))}</TableCell>
                <TableCell />
              </TableRow>
            </tfoot>
          </Table>
        )}
      </div>
      <p className="text-xs text-gray-400">
        UIF is calculated automatically (1% employee + 1% employer, capped at R177.12). PAYE is a manual entry — no PAYE
        calculation engine yet. The <TriangleAlert size={11} className="inline text-amber-500 -mt-0.5" /> flag means this
        employee&apos;s annualised gross pay has crossed the SARS tax threshold — worth confirming PAYE registration.
      </p>
    </div>
  )
}
