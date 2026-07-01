'use client'

import { useState } from 'react'
import type { KPIEntry } from '@/lib/ll-types'
import { cn } from '@/lib/utils'

interface Props {
  kpis: KPIEntry[]
  month: string
}

export function KPITable({ kpis: initial, month }: Props) {
  const [kpis, setKPIs] = useState(initial)
  const [saving, setSaving] = useState<string | null>(null)

  async function update(id: string, actual: number) {
    setSaving(id)
    setKPIs(prev => prev.map(k => k.id === id ? { ...k, actual } : k))
    await fetch('/api/labour-link/kpis', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, id, actual }),
    })
    setSaving(null)
  }

  function statusColor(actual: number, target: number) {
    const pct = target > 0 ? actual / target : 0
    if (pct >= 1) return 'text-[#18a86b] bg-[rgba(24,168,107,0.1)] border-[rgba(24,168,107,0.22)]'
    if (pct >= 0.5) return 'text-[#d4860a] bg-[rgba(212,134,10,0.1)] border-[rgba(212,134,10,0.22)]'
    return 'text-[#d93f3f] bg-[rgba(217,63,63,0.1)] border-[rgba(217,63,63,0.22)]'
  }

  function statusLabel(actual: number, target: number) {
    const pct = target > 0 ? actual / target : 0
    if (pct >= 1) return 'On target'
    if (pct >= 0.5) return 'In progress'
    return 'Behind'
  }

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5">
      <h3 className="mb-4 font-[family-name:var(--font-syne)] text-[11px] font-semibold uppercase tracking-widest text-gray-400">
        KPI Tracker — {month}
      </h3>

      {/* Header row */}
      <div className="mb-2 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 text-[10px] uppercase tracking-wider text-gray-400">
        <span>Metric</span>
        <span className="text-center">Actual</span>
        <span className="text-center">Target</span>
        <span className="text-center">Δ</span>
        <span className="text-center">Status</span>
      </div>

      {kpis.map(k => {
        const delta = k.actual - k.target
        return (
          <div
            key={k.id}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] items-center gap-2 border-t border-[rgba(0,0,0,0.06)] py-2.5"
          >
            <span className="text-[12px] text-gray-800">{k.label}</span>

            {/* Editable actual */}
            <div className="flex justify-center">
              <input
                type="number"
                min={0}
                value={k.actual}
                onChange={e => update(k.id, Number(e.target.value))}
                className={cn(
                  'w-16 rounded border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] py-1 text-center font-[family-name:var(--font-syne)] text-[15px] font-semibold text-gray-900 transition-all focus:border-[#3a6bef] focus:outline-none focus:ring-2 focus:ring-[rgba(58,107,239,0.1)]',
                  saving === k.id && 'opacity-60',
                )}
              />
            </div>

            <span className="text-center text-[12px] text-gray-400">{k.target}</span>

            <span className={cn('text-center text-[12px] font-medium', delta >= 0 ? 'text-[#18a86b]' : 'text-[#d93f3f]')}>
              {delta >= 0 ? '+' : ''}{delta}
            </span>

            <div className="flex justify-center">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px]', statusColor(k.actual, k.target))}>
                {statusLabel(k.actual, k.target)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
