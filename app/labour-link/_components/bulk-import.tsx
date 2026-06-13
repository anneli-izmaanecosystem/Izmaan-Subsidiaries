'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, Download, CheckCircle, AlertCircle } from 'lucide-react'
import type { LeadType, LeadStage, Priority } from '@/lib/ll-types'
import { cn } from '@/lib/utils'

const HEADERS = ['type', 'name', 'contact', 'phone', 'email', 'area', 'stage', 'priority', 'notes', 'blocker']
const TEMPLATE_CSV = [
  HEADERS.join(','),
  'll,Groot Boerdery,Johan Botha,0821234567,johan@boerdery.co.za,Limpopo,New Lead,medium,,',
  'sl,DRS Security,Dion Svoboda,0829339025,dion@drs.co.za,Limpopo,Meeting Done,high,Post meeting follow-up,',
  'kiepersol,AP Vos,Pieter,0823884087,,Kiepersol,New Lead,medium,,',
].join('\n')

type PreviewRow = Record<string, string> & { _rowNum: string }

function parseCSV(text: string): { headers: string[]; rows: PreviewRow[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }

  function splitLine(line: string): string[] {
    const fields: string[] = []
    let field = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { if (inQ && line[i + 1] === '"') { field += '"'; i++ } else inQ = !inQ }
      else if (c === ',' && !inQ) { fields.push(field.trim()); field = '' }
      else field += c
    }
    fields.push(field.trim())
    return fields
  }

  const headers = splitLine(lines[0]).map(h => h.toLowerCase().trim())
  const rows: PreviewRow[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const vals = splitLine(lines[i])
    const row: PreviewRow = { _rowNum: String(i + 1) }
    headers.forEach((h, j) => { row[h] = vals[j] ?? '' })
    if (!row.name?.trim()) row._error = 'Missing name'
    rows.push(row)
  }

  return { headers, rows }
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'labour-link-leads-template.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function BulkImport() {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const { headers: h, rows: r } = parseCSV(e.target?.result as string)
      setHeaders(h)
      setRows(r)
      setResult(null)
    }
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  async function confirm() {
    const valid = rows.filter(r => !r._error)
    if (!valid.length) return
    setImporting(true)
    const res = await fetch('/api/labour-link/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: valid }),
    })
    const data = await res.json()
    setResult(data)
    setImporting(false)
    router.refresh()
  }

  function reset() { setRows([]); setHeaders([]); setResult(null) }

  const valid = rows.filter(r => !r._error)
  const invalid = rows.filter(r => r._error)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.12)] bg-white px-3 py-2 text-[12px] font-medium text-gray-600 hover:bg-[#f5f6f8] transition-colors"
      >
        <Upload size={14} />
        Bulk Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,35,60,0.45)] p-6" onClick={() => { setOpen(false); reset() }}>
          <div
            className="relative flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-2xl border border-[rgba(0,0,0,0.14)] bg-white font-[family-name:var(--font-dm-mono)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.08)] p-5">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-[17px] font-bold text-gray-900">Bulk Import Leads</h2>
                <p className="text-[11px] text-gray-400">Upload a CSV file — max 500 rows per import</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-[11px] text-gray-500 hover:bg-[#f5f6f8]">
                  <Download size={12} /> Download Template
                </button>
                <button onClick={() => { setOpen(false); reset() }} className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {result ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <CheckCircle size={40} className="text-[#18a86b]" />
                  <div>
                    <p className="font-[family-name:var(--font-syne)] text-[18px] font-bold text-gray-900">
                      {result.imported} lead{result.imported !== 1 ? 's' : ''} imported
                    </p>
                    {result.errors.length > 0 && (
                      <div className="mt-3 rounded-lg border border-[rgba(217,63,63,0.2)] bg-[rgba(217,63,63,0.04)] p-3 text-left">
                        <p className="mb-1 text-[11px] font-medium text-[#d93f3f]">Skipped rows:</p>
                        {result.errors.map((e, i) => <p key={i} className="text-[11px] text-[#d93f3f]">{e}</p>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { reset(); setOpen(false) }} className="rounded-lg bg-[#3a6bef] px-5 py-2 text-[12px] font-medium text-white hover:opacity-90">
                    Done
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors',
                    dragging ? 'border-[#3a6bef] bg-[rgba(58,107,239,0.04)]' : 'border-[rgba(0,0,0,0.12)] hover:border-[#3a6bef] hover:bg-[#f5f6f8]',
                  )}
                >
                  <Upload size={24} className="mb-3 text-gray-300" />
                  <p className="text-[13px] font-medium text-gray-700">Drop CSV file here or click to browse</p>
                  <p className="mt-1 text-[11px] text-gray-400">Columns: type, name, contact, phone, email, area, stage, priority, notes, blocker</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                </div>
              ) : (
                <div>
                  {/* Summary */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-full border border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.08)] px-3 py-1 text-[11px] font-medium text-[#18a86b]">
                      {valid.length} valid
                    </span>
                    {invalid.length > 0 && (
                      <span className="rounded-full border border-[rgba(217,63,63,0.3)] bg-[rgba(217,63,63,0.06)] px-3 py-1 text-[11px] font-medium text-[#d93f3f]">
                        {invalid.length} will be skipped (missing name)
                      </span>
                    )}
                    <button onClick={reset} className="ml-auto text-[11px] text-gray-400 hover:text-gray-700">Clear</button>
                  </div>

                  {/* Preview table */}
                  <div className="overflow-x-auto rounded-xl border border-[rgba(0,0,0,0.08)]">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-[rgba(0,0,0,0.08)] bg-[#f5f6f8]">
                          {['#', 'type', 'name', 'contact', 'phone', 'area', 'stage', 'priority'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                          ))}
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 50).map(r => (
                          <tr key={r._rowNum} className={cn('border-b border-[rgba(0,0,0,0.04)]', r._error && 'bg-[rgba(217,63,63,0.03)]')}>
                            <td className="px-3 py-2 text-gray-400">{r._rowNum}</td>
                            <td className="px-3 py-2"><span className="rounded-full bg-[#f0f2f5] px-2 py-0.5 text-[10px]">{r.type || 'll'}</span></td>
                            <td className="px-3 py-2 font-medium text-gray-900">{r.name || <span className="text-[#d93f3f]">—</span>}</td>
                            <td className="px-3 py-2 text-gray-500">{r.contact || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.phone || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.area || 'Limpopo'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.stage || 'New Lead'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.priority || 'medium'}</td>
                            <td className="px-3 py-2">
                              {r._error
                                ? <AlertCircle size={13} className="text-[#d93f3f]" />
                                : <CheckCircle size={13} className="text-[#18a86b]" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 50 && (
                      <p className="px-3 py-2 text-[11px] text-gray-400">… and {rows.length - 50} more rows</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {rows.length > 0 && !result && (
              <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.08)] p-4">
                <p className="text-[11px] text-gray-400">
                  {valid.length} lead{valid.length !== 1 ? 's' : ''} ready to import
                </p>
                <button
                  onClick={confirm}
                  disabled={importing || valid.length === 0}
                  className="rounded-lg bg-[#3a6bef] px-5 py-2 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {importing ? 'Importing…' : `Import ${valid.length} lead${valid.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
