'use client'

import { useState, useMemo, type FormEvent } from 'react'
import { Search, Plus, X } from 'lucide-react'
import type { Lead, LeadStage, LeadType, Priority } from '@/lib/ll-types'
import { LeadModal } from './lead-modal'
import { cn } from '@/lib/utils'

const STAGES_LL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Active Client', 'Churned']
const STAGES_SL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Implementing', 'Active Client', 'Churned']

const STAGE_COLORS: Record<string, string> = {
  'New Lead':     '#7a8199',
  'Contacted':    '#3a6bef',
  'Meeting Done': '#7c50d8',
  'Onboarding':   '#d4860a',
  'Implementing': '#d4860a',
  'Active Client':'#18a86b',
  'Churned':      '#9ca3af',
}

function daysSince(dateStr: string) {
  if (!dateStr) return 9999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ─── Kanban board ─────────────────────────────────────────────────────────────
interface KanbanProps {
  leads:       Lead[]
  pipeline:    'll' | 'sl'
  waConfigured: boolean
  onUpdate:    (id: string, updates: Partial<Lead>, movedLead?: Lead) => void
  onRemove:    (id: string) => void
}

function KanbanBoard({ leads, pipeline, waConfigured, onUpdate, onRemove }: KanbanProps) {
  const [selected,      setSelected]      = useState<Lead | null>(null)
  const [draggedId,     setDraggedId]     = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null)

  const stages = pipeline === 'll' ? STAGES_LL : STAGES_SL

  function handleDrop(toStage: LeadStage) {
    if (!draggedId) return
    const lead = leads.find(l => l.id === draggedId)
    if (!lead || lead.stage === toStage) { setDragOverStage(null); return }

    // Optimistic update
    onUpdate(draggedId, { stage: toStage })

    fetch('/api/labour-link/leads', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: pipeline, id: draggedId, updates: { stage: toStage } }),
    })

    setDraggedId(null)
    setDragOverStage(null)
  }

  return (
    <>
      <div className="grid grid-cols-6 gap-2.5">
        {stages.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage)
          const isOver     = dragOverStage === stage && draggedId !== null
          const isChurned  = stage === 'Churned'

          return (
            <div
              key={stage}
              className={cn(
                'min-h-[400px] rounded-xl border p-3 transition-colors duration-100',
                isOver
                  ? 'border-[#3a6bef] bg-[rgba(58,107,239,0.04)]'
                  : isChurned
                  ? 'border-[rgba(0,0,0,0.05)] bg-[rgba(0,0,0,0.015)]'
                  : 'border-[rgba(0,0,0,0.08)] bg-white',
              )}
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStage(stage) }}
              onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverStage(null)
                }
              }}
              onDrop={() => handleDrop(stage)}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-gray-400">{stage}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 font-[family-name:var(--font-syne)] text-[11px] font-semibold"
                  style={{ color: STAGE_COLORS[stage], background: `${STAGE_COLORS[stage]}18` }}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Drop target hint on empty column */}
              {isOver && stageLeads.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-[rgba(58,107,239,0.35)] p-4 text-center text-[11px] text-[#3a6bef]/50">
                  Drop here
                </div>
              )}

              <div className="space-y-2">
                {stageLeads.map(l => {
                  const days       = daysSince(l.lastContact)
                  const overdue    = days > 14 && stage !== 'Active Client' && stage !== 'Churned'
                  const isDragging = draggedId === l.id

                  return (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', l.id)
                        setDraggedId(l.id)
                      }}
                      onDragEnd={() => { setDraggedId(null); setDragOverStage(null) }}
                      onClick={() => setSelected(l)}
                      className={cn(
                        'rounded-lg border p-2.5 transition-all select-none',
                        isDragging
                          ? 'cursor-grabbing opacity-40 shadow-none'
                          : 'cursor-grab hover:shadow-sm active:cursor-grabbing',
                        isChurned
                          ? 'border-[rgba(0,0,0,0.06)] bg-white/60 opacity-70 hover:opacity-100'
                          : overdue
                          ? 'border-[rgba(217,63,63,0.3)] bg-[rgba(217,63,63,0.03)] hover:border-[rgba(217,63,63,0.5)]'
                          : 'border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] hover:border-[rgba(0,0,0,0.14)] hover:bg-[#eaedf1]',
                      )}
                    >
                      <p className={cn('text-[12px] font-medium', isChurned ? 'text-gray-400' : 'text-gray-900')}>{l.name}</p>
                      <p className="text-[11px] text-gray-400">{l.contact}</p>
                      {l.phone && !isChurned && (
                        <p className="mt-1 text-[10px] text-[#18a86b]">📱 {l.phone}</p>
                      )}
                      {l.churnReason && isChurned && (
                        <p className="mt-1 truncate text-[10px] text-[#9ca3af]">↳ {l.churnReason}</p>
                      )}
                      {l.blocker && !isChurned && (
                        <p className="mt-1 truncate text-[10px] text-[#d4860a]">⚠ {l.blocker.slice(0, 30)}</p>
                      )}
                      {!isChurned && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          {days < 9999 ? `${days}d ago` : 'not contacted'}
                        </p>
                      )}
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
          onUpdate={(id, updates, movedLead) => {
            onUpdate(id, updates, movedLead)
            if (!movedLead) setSelected(prev => prev ? { ...prev, ...updates } : null)
          }}
          onRemove={() => { onRemove(selected.id); setSelected(null) }}
        />
      )}
    </>
  )
}

// ─── Kiepersol checklist ──────────────────────────────────────────────────────
interface KiepProps {
  farms:          Lead[]
  totalContacted: number
  totalFarms:     number
  onToggle:       (id: string, contacted: boolean) => void
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

// ─── Add Lead modal ───────────────────────────────────────────────────────────
interface AddLeadModalProps {
  pipeline: 'll' | 'sl' | 'kiepersol'
  onClose: () => void
  onCreate: (lead: Lead) => void
}

function AddLeadModal({ pipeline, onClose, onCreate }: AddLeadModalProps) {
  const [name,     setName]     = useState('')
  const [contact,  setContact]  = useState('')
  const [phone,    setPhone]    = useState('')
  const [area,     setArea]     = useState('')
  const [stage,    setStage]    = useState<LeadStage>('New Lead')
  const [priority, setPriority] = useState<Priority>('medium')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  const stages = pipeline === 'sl' ? STAGES_SL : STAGES_LL

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')

    const res = await fetch('/api/labour-link/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: pipeline, lead: { name: name.trim(), contact, phone, area, stage, priority } }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create lead'); setSaving(false); return }
    onCreate(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,35,60,0.45)] p-6" onClick={onClose}>
      <div
        className="relative w-full max-w-[480px] rounded-2xl border border-[rgba(0,0,0,0.14)] bg-white font-[family-name:var(--font-dm-mono)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[rgba(0,0,0,0.08)] p-6 pb-4">
          <button onClick={onClose} className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] text-gray-400 hover:text-gray-700">
            <X size={14} />
          </button>
          <h2 className="font-[family-name:var(--font-syne)] text-[18px] font-bold text-gray-900">New Lead</h2>
          <p className="text-[11px] text-gray-400">
            {pipeline === 'll' ? 'Labour Link' : pipeline === 'sl' ? 'Safe Link' : 'Kiepersol'} pipeline
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Farm / Company Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Boerdery van der Merwe"
              className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none focus:ring-2 focus:ring-[rgba(58,107,239,0.08)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Contact Person</label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="e.g. Jan van der Merwe"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Phone</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 082 123 4567"
                className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-gray-400">Area</label>
            <input
              value={area}
              onChange={e => setArea(e.target.value)}
              placeholder="e.g. Limpopo, Tzaneen"
              className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none"
            />
          </div>

          {pipeline !== 'kiepersol' && (
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-widest text-gray-400">Stage</label>
              <div className="flex flex-wrap gap-1.5">
                {stages.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStage(s)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] transition-all',
                      stage === s
                        ? 'border-current bg-current/10'
                        : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:border-[#3a6bef] hover:text-[#3a6bef]',
                    )}
                    style={stage === s ? { borderColor: STAGE_COLORS[s], color: STAGE_COLORS[s], background: `${STAGE_COLORS[s]}18` } : {}}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-widest text-gray-400">Priority</label>
            <div className="flex gap-1.5">
              {(['high', 'medium', 'low'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] capitalize transition-all',
                    priority === p
                      ? p === 'high'   ? 'border-[#d93f3f] bg-[rgba(217,63,63,0.1)] text-[#d93f3f]'
                      : p === 'medium' ? 'border-[#d4860a] bg-[rgba(212,134,10,0.1)] text-[#d4860a]'
                      :                  'border-[#7a8199] bg-[rgba(122,129,153,0.1)] text-[#7a8199]'
                      : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:bg-[#f5f6f8]',
                  )}
                >{p}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-[11px] text-[#d93f3f]">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-1.5 text-[12px] text-gray-500 hover:bg-[#f5f6f8] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !name.trim()}
              className="rounded-lg bg-[#3a6bef] px-4 py-1.5 text-[12px] text-white hover:opacity-85 disabled:opacity-50 transition-opacity">
              {saving ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
type Tab = 'll' | 'sl' | 'kiepersol'

interface Props {
  leadsLL:     Lead[]
  leadsSL:     Lead[]
  kiepersol:   Lead[]
  waConfigured: boolean
}

export function PipelineBoard({ leadsLL: initLL, leadsSL: initSL, kiepersol: initKiep, waConfigured }: Props) {
  const [tab,        setTab]        = useState<Tab>('ll')
  const [leadsLL,    setLeadsLL]    = useState(initLL)
  const [leadsSL,    setLeadsSL]    = useState(initSL)
  const [kiepersol,  setKiepersol]  = useState(initKiep)
  const [query,      setQuery]      = useState('')
  const [addingLead, setAddingLead] = useState(false)

  function updateLeads(type: LeadType, id: string, updates: Partial<Lead>, movedLead?: Lead) {
    const newType = updates.type as LeadType | undefined
    if (newType && newType !== type && movedLead) {
      if (type === 'll')        setLeadsLL(prev => prev.filter(l => l.id !== id))
      if (type === 'sl')        setLeadsSL(prev => prev.filter(l => l.id !== id))
      if (newType === 'll')        setLeadsLL(prev => [...prev, movedLead])
      if (newType === 'sl')        setLeadsSL(prev => [...prev, movedLead])
      if (newType === 'kiepersol') setKiepersol(prev => [...prev, movedLead])
      return
    }
    if (type === 'll') setLeadsLL(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    if (type === 'sl') setLeadsSL(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  function addLead(lead: Lead) {
    if (lead.type === 'll')        setLeadsLL(prev => [...prev, lead])
    if (lead.type === 'sl')        setLeadsSL(prev => [...prev, lead])
    if (lead.type === 'kiepersol') setKiepersol(prev => [...prev, lead])
  }

  function removeLead(type: LeadType, id: string) {
    if (type === 'll') setLeadsLL(prev => prev.filter(l => l.id !== id))
    if (type === 'sl') setLeadsSL(prev => prev.filter(l => l.id !== id))
  }

  async function toggleKiep(id: string, contacted: boolean) {
    setKiepersol(prev => prev.map(f => f.id === id ? { ...f, contacted } : f))
    await fetch('/api/labour-link/leads', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type: 'kiepersol', id, updates: { contacted } }),
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
    { key: 'll',        label: 'Labour Link', count: filteredLL.filter(l => l.stage !== 'Active Client' && l.stage !== 'Churned').length },
    { key: 'sl',        label: 'Safe Link',   count: filteredSL.filter(l => l.stage !== 'Active Client' && l.stage !== 'Churned').length },
    { key: 'kiepersol', label: 'Kiepersol',   count: filteredKiep.filter(k => !k.contacted).length },
  ]

  return (
    <div>
      {/* Search + Tabs */}
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
        <button
          onClick={() => setAddingLead(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#3a6bef] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-85 transition-opacity"
        >
          <Plus size={12} /> New Lead
        </button>
      </div>

      {tab === 'll' && (
        <KanbanBoard leads={filteredLL} pipeline="ll" waConfigured={waConfigured} onUpdate={(id, u, m) => updateLeads('ll', id, u, m)} onRemove={id => removeLead('ll', id)} />
      )}
      {tab === 'sl' && (
        <KanbanBoard leads={filteredSL} pipeline="sl" waConfigured={waConfigured} onUpdate={(id, u, m) => updateLeads('sl', id, u, m)} onRemove={id => removeLead('sl', id)} />
      )}
      {tab === 'kiepersol' && (
        <KiepersrolList
          farms={filteredKiep}
          totalContacted={kiepersol.filter(f => f.contacted).length}
          totalFarms={kiepersol.length}
          onToggle={toggleKiep}
        />
      )}

      {addingLead && (
        <AddLeadModal
          pipeline={tab}
          onClose={() => setAddingLead(false)}
          onCreate={addLead}
        />
      )}
    </div>
  )
}
