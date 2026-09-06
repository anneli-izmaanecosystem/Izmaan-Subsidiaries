'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Wallet, Plus, Users, FileSpreadsheet } from 'lucide-react'

type Run = { id: number; periodStart: string; periodEnd: string; status: 'draft' | 'finalised' }

function monthLabel(ymd: string) {
  const [y, m] = ymd.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
}

function currentMonthYm() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ym is 'YYYY-MM' (from an <input type="month">)
function monthRangeFromYm(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end   = new Date(y, m, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function PayrollPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [selectedYm, setSelectedYm] = useState(currentMonthYm())

  useEffect(() => {
    fetch('/api/payroll')
      .then(res => res.json())
      .then(setRuns)
      .finally(() => setLoading(false))
  }, [])

  async function refetchRuns() {
    const res = await fetch('/api/payroll')
    setRuns(await res.json())
  }

  async function createRun() {
    setCreateError('')
    const { start, end } = monthRangeFromYm(selectedYm)
    if (runs.some(r => r.periodStart === start)) {
      setCreateError(`A run for ${monthLabel(start)} already exists.`)
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart: start, periodEnd: end }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed to create run (${res.status})`)
      await refetchRuns()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create run')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Wallet size={20} /> Payroll
          </h1>
          <p className="mt-1 text-sm text-gray-500">Monthly payroll runs for Izmaan Property Developments</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/payroll/employees">
            <Button variant="outline" size="sm" className="gap-2"><Users size={14} /> Employees</Button>
          </Link>
          <Link href="/dashboard/payroll/coida-summary">
            <Button variant="outline" size="sm" className="gap-2"><FileSpreadsheet size={14} /> COIDA Summary</Button>
          </Link>
          <input
            type="month"
            value={selectedYm}
            onChange={e => { setSelectedYm(e.target.value); setCreateError('') }}
            className="h-7 rounded-lg border border-gray-200 bg-white px-2 text-[0.8rem] text-gray-700"
          />
          <Button size="sm" className="gap-2" onClick={createRun} disabled={creating}>
            <Plus size={14} /> {creating ? 'Creating…' : 'New Run'}
          </Button>
        </div>
      </div>
      {createError && <p className="text-sm text-red-600">{createError}</p>}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : runs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No payroll runs yet — pick a month above and create one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs">Period</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(run => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium text-gray-900">{monthLabel(run.periodStart)}</TableCell>
                  <TableCell>
                    <Badge variant={run.status === 'finalised' ? 'default' : 'outline'} className="text-xs font-normal">
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/payroll/${run.id}`} className="text-sm text-blue-600 hover:underline">
                      View →
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
