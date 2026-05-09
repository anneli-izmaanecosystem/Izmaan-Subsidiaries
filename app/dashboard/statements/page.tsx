'use client'

import { useState, useEffect } from 'react'
import { StatementViewer } from '@/components/statement-viewer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerStatement, QBOCustomer } from '@/lib/qbo'
import { FileText, RefreshCw } from 'lucide-react'

function thisMonthRange() {
  const now   = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function StatementsPage() {
  const [customers,   setCustomers]   = useState<QBOCustomer[]>([])
  const [customer,    setCustomer]    = useState('')
  const [startDate,   setStartDate]   = useState(thisMonthRange().start)
  const [endDate,     setEndDate]     = useState(thisMonthRange().end)
  const [statement,   setStatement]   = useState<CustomerStatement | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [loadingCust, setLoadingCust] = useState(true)

  useEffect(() => {
    fetch('/api/qbo/customers')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCustomers(data)
        else setError(data.error ?? 'Could not load customers')
      })
      .catch(() => setError('Could not load customers'))
      .finally(() => setLoadingCust(false))
  }, [])

  async function generate() {
    if (!customer || !startDate || !endDate) return
    setLoading(true)
    setError('')
    setStatement(null)
    try {
      const res  = await fetch(`/api/statements?customerId=${encodeURIComponent(customer)}&startDate=${startDate}&endDate=${endDate}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatement(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Customer Statements</h1>
        <p className="mt-1 text-sm text-gray-500">Select a customer and date range to generate a statement.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-5">
        {/* Customer */}
        <div className="flex flex-col gap-1.5 min-w-[220px]">
          <Label className="text-xs text-gray-500">Customer</Label>
          {loadingCust ? (
            <Skeleton className="h-9 w-[220px]" />
          ) : (
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.Id} value={c.Id}>{c.DisplayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Start date */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 text-sm w-36" />
        </div>

        {/* End date */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 text-sm w-36" />
        </div>

        <Button onClick={generate} disabled={!customer || loading} className="h-9 gap-2">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
          {loading ? 'Generating…' : 'Generate Statement'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-8">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="mt-6 h-48 w-full" />
        </div>
      )}

      {/* Statement */}
      {statement && !loading && <StatementViewer statement={statement} />}

      {/* Empty state */}
      {!statement && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-20 text-center">
          <FileText size={36} className="text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-400">Select a customer and click Generate Statement</p>
        </div>
      )}
    </div>
  )
}
