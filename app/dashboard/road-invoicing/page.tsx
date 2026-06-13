'use client'

import { useState, useRef } from 'react'
import { Upload, Download, FileText, AlertTriangle, CheckCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  parseATGCSV,
  parseCashList,
  processATG,
  invoicesToCSV,
  customersToCSV,
  type InvoiceRow,
  type CustomerRecord,
  type CashEntry,
} from '@/lib/road-invoicing'

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function RoadInvoicingPage() {
  const [atgFile, setAtgFile]       = useState<File | null>(null)
  const [cashText, setCashText]     = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult]         = useState<{
    invoices: InvoiceRow[]
    customers: CustomerRecord[]
    unmatched: CashEntry[]
    filename: string
  } | null>(null)
  const [error, setError]           = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleProcess() {
    if (!atgFile) { setError('Please upload an ATG CSV file.'); return }
    setProcessing(true); setError(''); setResult(null)
    try {
      const text = await atgFile.text()
      const rows = parseATGCSV(text)
      if (!rows.length) { setError('No data rows found in the ATG file.'); return }
      const cash = parseCashList(cashText)
      const { invoices, customers, unmatched } = processATG(rows, cash)
      const base = atgFile.name.replace(/\.csv$/i, '')
      setResult({ invoices, customers, unmatched, filename: base })
    } catch (e: any) {
      setError(e.message ?? 'Processing failed.')
    } finally {
      setProcessing(false)
    }
  }

  const cashCount   = result?.invoices.filter(r => r.invoiceNo === 'Cash').length ?? 0
  const invoiceCount = result?.invoices.filter(r => !r.invoiceNo).length ?? 0

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Road Invoicing</h1>
      <p className="text-sm text-gray-500 mb-8">Upload ATG gate scan CSV → generate QBO invoice file + customer list</p>

      <div className="space-y-6">

        {/* ATG File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ATG Gate Scan CSV</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
              atgFile ? 'border-gray-300 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            )}
          >
            <Upload size={24} className="mb-2 text-gray-400" />
            {atgFile ? (
              <p className="text-sm font-medium text-gray-700">{atgFile.name}</p>
            ) : (
              <p className="text-sm text-gray-500">Click to upload ATG export CSV</p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { setAtgFile(e.target.files?.[0] ?? null); setResult(null) }}
            />
          </div>
        </div>

        {/* Cash List */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Trevor&apos;s Cash List
            <span className="ml-2 text-xs font-normal text-gray-400">Paste WhatsApp list — format: DRIVER PLATE-RAMOUNT</span>
          </label>
          <textarea
            value={cashText}
            onChange={e => { setCashText(e.target.value); setResult(null) }}
            placeholder={`7 June 2026 TAWAS HDC 898-R1000\nCLADI FYK 198-R1000\nABSOLOM FZV 390-R900\n...`}
            rows={10}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300 resize-y"
          />
          {cashText && (
            <p className="mt-1 text-xs text-gray-400">
              {parseCashList(cashText).length} cash entries parsed
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={!atgFile || processing}
          className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {processing ? 'Processing…' : 'Process →'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-10 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Trips', value: result.invoices.length, icon: FileText, color: 'text-gray-700' },
              { label: 'Cash Confirmed', value: cashCount, icon: CheckCircle, color: 'text-green-600' },
              { label: 'Invoice Outstanding', value: invoiceCount, icon: AlertTriangle, color: 'text-amber-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={color} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Unmatched cash warnings */}
          {result.unmatched.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                ⚠ {result.unmatched.length} cash {result.unmatched.length === 1 ? 'entry' : 'entries'} not matched to an ATG trip:
              </p>
              <ul className="space-y-0.5">
                {result.unmatched.map((e, i) => (
                  <li key={i} className="text-xs font-mono text-amber-700">{e.raw} — R{e.amount}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-600">These may be from a previous batch or the plate was not scanned on entry.</p>
            </div>
          )}

          {/* Downloads */}
          <div className="flex gap-3">
            <button
              onClick={() => downloadCSV(invoicesToCSV(result.invoices), `${result.filename}_QBO_Invoices.csv`)}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              <Download size={14} /> QBO Invoice CSV
            </button>
            <button
              onClick={() => downloadCSV(customersToCSV(result.customers), `${result.filename}_Customers.csv`)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Users size={14} /> Customer List CSV
            </button>
          </div>

          {/* Invoice preview table */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Invoice Preview</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    {['#', 'Customer', 'Date', 'Item', 'Rate', 'Amount', 'Phone', 'Plate', 'Driver', 'Trip', 'Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.invoices.map((r, i) => (
                    <tr key={i} className={cn(
                      'hover:bg-gray-50',
                      r.invoiceNo === 'Cash' ? 'bg-green-50/40' : 'bg-white'
                    )}>
                      <td className="px-3 py-2 font-medium text-gray-500">{r.invoiceNo || <span className="text-amber-500">—</span>}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.customer}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.serviceDate}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.item}</td>
                      <td className="px-3 py-2 text-gray-600">R{r.rate}</td>
                      <td className={cn('px-3 py-2 font-medium',
                        r.amount === r.rate ? 'text-green-600' :
                        r.amount < r.rate  ? 'text-red-600' : 'text-blue-600'
                      )}>R{r.amount}</td>
                      <td className="px-3 py-2 text-gray-500">{r.phone || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 font-mono">{r.licence}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.driver}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.tripType}</td>
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate" title={r.notes}>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
