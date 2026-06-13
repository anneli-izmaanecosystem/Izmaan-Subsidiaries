'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Lead, LeadStage, LeadType } from '@/lib/ll-types'
import { LeadModal } from './lead-modal'
import { cn } from '@/lib/utils'

const STAGES_LL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Active Client']
const STAGES_SL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Implementing', 'Active Client']

const STAGE_COLORS: Record<string, string> = {
  'New Lead':     '#7a8199',
  'Contacted':    '#3a6bef',
  'Meeting Done': '#7c50d8',
  'Onboarding':   '#d4860a',
  'Implementing': '#d4860a',
  'Active Client':'#18a86b',
}

function daysSince(dateStr: string) {
  if (!dateStr) return 9999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

interface KanbanProps {
  leads: Lead[]
  pipeline: 'll' | 'sl'
  waConfigured: boolean
  onUpdate: (id: string, updates: Partial<Lead>) => void
}

function KanbanBoard({ leads, pipeline, waConfigured, onUpdate }: KanbanProps) {
  const [selected, setSelected] = useState<Lead | null>(null)
  const stages = pipeline === 'll' ? STAGES_LL : STAGES_SL

  return (
    <>
      <div className="grid grid-cols-5 gap-2.5">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage)
          return (
            <div key={stage} className="min-h-[400px] rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">{stage}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 font-[family-name:var(--font-syne)] text-[11px] font-semibold"
                  style={{ color: STAGE_COLORS[stage], background: `${STAGE_COLORS[stage]}18` }}
                >
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-2">
                {stageLeads.map(l => {
                  const days = daysSince(l.lastContact)
                  const overdue = days > 14 && stage !== 'Active Client'
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelected(l)}
                      className={cn(
                        'cursor-pointer rounded-lg border p-2.5 transition-all hover:shadow-sm',
                        overdue
                          ? 'border-[rgba(217,63,63,0.3)] bg-[rgba(217,63,63,0.03)] hover:border-[rgba(217,63,63,0.5)]'
                          : 'border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] hover:border-[rgba(0,0,0,0.14)] hover:bg-[#eaedf1]',
                      )}
                    >
                      <p className="text-[12px] font-medium text-gray-900">{l.name}</p>
                      <p className="text-[11px] text-gray-400">{l.contact}</p>
                      {l.phone && (
                        <p className="mt-1 text-[10px] text-[#18a86b]">📱 {l.phone}</p>
                      )}
                      {l.blocker && (
                        <p className="mt-1 truncate text-[10px] text-[#d4860a]">⚠ {l.blocker.slice(0, 30)}</p>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">
                        {days < 9999 ? `${days}d ago` : 'not contacted'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <LeadModal
          lead={leads.find(l => l.id === selected.id) ?? selected}
          pipeline={pipeline}
          waConfigured={waConfigured}
          onClose={() => setSelected(null)}
          onUpdate={(id, updates) => {
            onUpdate(id, updates)
            setSelected(prev => prev ? { ...prev, ...updates } : null)
          }}
        />
      )}
    </>
  )
}

// ─── Kiepersol checklist ──────────────────────────────────────────────────────
interface KiepProps {
  farms: Lead[]
  totalContacted: number
  totalFarms: number
  onToggle: (id: string, contacted: boolean) => void
}

function KiepersrolList({ farms, totalContacted, totalFarms, onToggle }: KiepProps) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Contacted</p>
          <p className="font-[family-name:var(--font-syne)] text-[26px] font-bold text-[#18a86b]">{totalContacted}/{totalFarms}</p>
          <p className="text-[11px] text-gray-400">Target: 15 for group pricing</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#18a86b]" style={{ width: `${Math.min(100, (totalContacted / 15) * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {farms.map(f => (
          <div
            key={f.id}
            onClick={() => onToggle(f.id, !f.contacted)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all',
              f.contacted
                ? 'border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.06)]'
                : 'border-[rgba(0,0,0,0.08)] bg-white hover:bg-[#f5f6f8]',
            )}
          >
            <div className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px]',
              f.contacted ? 'border-[#18a86b] bg-[#18a86b] text-white' : 'border-gray-300 text-transparent',
            )}>✓</div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-gray-900">{f.name}</p>
              <p className="text-[11px] text-gray-400">{f.contact} · {f.phone || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
type Tab = 'll' | 'sl' | 'kiepersol'

interface Props {
  leadsLL: Lead[]
  leadsSL: Lead[]
  kiepersol: Lead[]
  waConfigured: boolean
}

export function PipelineBoard({ leadsLL: initLL, leadsSL: initSL, kiepersol: initKiep, waConfigured }: Props) {
  const [tab, setTab] = useState<Tab>('ll')
  const [leadsLL, setLeadsLL] = useState(initLL)
  const [leadsSL, setLeadsSL] = useState(initSL)
  const [kiepersol, setKiepersol] = useState(initKiep)
  const [query, setQuery] = useState('')

  function updateLeads(type: LeadType, id: string, updates: Partial<Lead>) {
    if (type === 'll') setLeadsLL(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    if (type === 'sl') setLeadsSL(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  async function toggleKiep(id: string, contacted: boolean) {
    setKiepersol(prev => prev.map(f => f.id === id ? { ...f, contacted } : f))
    await fetch('/api/labour-link/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'kiepersol', id, updates: { contacted } }),
    })
  }

  const q = query.toLowerCase().trim()

  const filteredLL = useMemo(() =>
    q ? leadsLL.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.contact?.toLowerCase().includes(q) ||
      l.area?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    ) : leadsLL,
    [leadsLL, q]
  )

  const filteredSL = useMemo(() =>
    q ? leadsSL.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.contact?.toLowerCase().includes(q) ||
      l.area?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    ) : leadsSL,
    [leadsSL, q]
  )

  const filteredKiep = useMemo(() =>
    q ? kiepersol.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.contact?.toLowerCase().includes(q) ||
      f.phone?.includes(q)
    ) : kiepersol,
    [kiepersol, q]
  )

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'll',        label: 'Labour Link', count: filteredLL.filter(l => l.stage !== 'Active Client').length },
    { key: 'sl',        label: 'Safe Link',   count: filteredSL.filter(l => l.stage !== 'Active Client').length },
    { key: 'kiepersol', label: 'Kiepersol',   count: filteredKiep.filter(k => !k.contacted).length },
  ]

  return (
    <div>
      {/* Search + Tabs row */}
      <div className="mb-5 flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search leads…"
            className="h-8 w-[200px] rounded-lg border border-[rgba(0,0,0,0.12)] bg-white pl-7 pr-3 text-[12px] placeholder-gray-400 focus:border-[#3a6bef] focus:outline-none focus:ring-2 focus:ring-[rgba(58,107,239,0.08)]"
          />
        </div>
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all',
                tab === t.key
                  ? 'bg-[#3a6bef] text-white'
                  : 'border border-[rgba(0,0,0,0.08)] bg-white text-gray-500 hover:bg-[#f5f6f8]',
              )}
            >
              {t.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]',
                tab === t.key ? 'bg-white/20 text-white' : 'bg-[#f0f2f5] text-gray-500',
              )}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
        {q && (
          <span className="text-[11px] text-gray-400">
            {filteredLL.length + filteredSL.length + filteredKiep.length} result{filteredLL.length + filteredSL.length + filteredKiep.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {tab === 'll' && (
        <KanbanBoard leads={filteredLL} pipeline="ll" waConfigured={waConfigured} onUpdate={(id, u) => updateLeads('ll', id, u)} />
      )}
      {tab === 'sl' && (
        <KanbanBoard leads={filteredSL} pipeline="sl" waConfigured={waConfigured} onUpdate={(id, u) => updateLeads('sl', id, u)} />
      )}
      {tab === 'kiepersol' && (
        <KiepersrolList
          farms={filteredKiep}
          totalContacted={kiepersol.filter(f => f.contacted).length}
          totalFarms={kiepersol.length}
          onToggle={toggleKiep}
        />
      )}
    </div>
  )
}
