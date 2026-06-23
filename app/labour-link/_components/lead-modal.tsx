'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Copy, Check } from 'lucide-react'
import type { Lead, LeadStage, LeadType, WAInteraction, InteractionOutcome } from '@/lib/ll-types'
import { getTemplateForStage, formatWAUrl, TEMPLATES, type Template } from '@/lib/ll-templates'
import { cn } from '@/lib/utils'

const STAGES_LL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Active Client', 'Churned']
const STAGES_SL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Implementing', 'Active Client', 'Churned']
const STAGE_COLORS: Record<string, string> = {
  'New Lead':      '#7a8199',
  'Contacted':     '#3a6bef',
  'Meeting Done':  '#7c50d8',
  'Onboarding':    '#d4860a',
  'Implementing':  '#d4860a',
  'Active Client': '#18a86b',
  'Churned':       '#9ca3af',
}

const CHURN_REASONS = [
  'Too expensive',
  'Chose competitor',
  'No budget / cashflow',
  'Timing not right',
  'No decision maker access',
  'Lost contact / unresponsive',
  'Not a fit',
  'Other',
]

const OUTCOME_OPTIONS: { value: InteractionOutcome; label: string; color: string }[] = [
  { value: 'responded',    label: 'Client responded',  color: '#18a86b' },
  { value: 'no-response',  label: 'No response',       color: '#7a8199' },
  { value: 'follow-up',    label: 'Follow-up needed',  color: '#d4860a' },
  { value: 'wrong-number', label: 'Wrong number',      color: '#d93f3f' },
]

const PIPELINE_LABELS: Record<string, string> = {
  'll':        'Labour Link',
  'sl':        'Safe Link',
  'kiepersol': 'Kiepersol',
}

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60)  return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

interface Props {
  lead: Lead
  pipeline: 'll' | 'sl'
  waConfigured?: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Lead>, movedLead?: Lead) => void
  onRemove?: () => void
}

export function LeadModal({ lead, pipeline, onClose, onUpdate, onRemove }: Props) {
  const [localLead,     setLocalLead]     = useState(lead)
  const [notes,         setNotes]         = useState(lead.notes)
  const [blocker,       setBlocker]       = useState(lead.blocker)
  const [lastContact,   setLastContact]   = useState(lead.lastContact)
  const [churnReason,   setChurnReason]   = useState(lead.churnReason ?? '')
  const [saving,        setSaving]        = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing,      setRemoving]      = useState(false)
  const [tab, setTab] = useState<'details' | 'whatsapp'>('details')

  // WhatsApp compose state
  const [templates,      setTemplates]      = useState<Template[]>(TEMPLATES)
  const [selectedTplId,  setSelectedTplId]  = useState<string>('')
  const [customText,     setCustomText]     = useState('')
  const [copied,         setCopied]         = useState(false)

  // Interaction log state
  const [interactions,     setInteractions]     = useState<WAInteraction[]>([])
  const [loadingHistory,   setLoadingHistory]   = useState(false)
  const [logOpen,          setLogOpen]          = useState(false)
  const [logOutcome,       setLogOutcome]       = useState<InteractionOutcome | ''>('')
  const [logNotes,         setLogNotes]         = useState('')
  const [logDate,          setLogDate]          = useState(() => new Date().toISOString().split('T')[0])
  const [savingLog,        setSavingLog]        = useState(false)

  const stages = pipeline === 'll' ? STAGES_LL : STAGES_SL
  const defaultTpl = getTemplateForStage(localLead.stage, pipeline, localLead.contact)

  // Load live templates
  useEffect(() => {
    fetch('/api/labour-link/templates')
      .then(r => r.json())
      .then((data: Template[]) => { if (Array.isArray(data)) setTemplates(data) })
      .catch(() => {/* keep static fallback */})
  }, [])

  // On tab open: pre-select stage template + load interaction history
  useEffect(() => {
    if (tab !== 'whatsapp') return

    // Pre-select the right template for this lead's stage
    setSelectedTplId(defaultTpl.id)

    // Load interaction history
    setLoadingHistory(true)
    fetch(`/api/labour-link/interactions?leadId=${lead.id}`)
      .then(r => r.json())
      .then((data: WAInteraction[]) => {
        if (Array.isArray(data)) setInteractions(data)
      })
      .finally(() => setLoadingHistory(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lead.id])

  // Populate textarea when template changes
  useEffect(() => {
    if (!selectedTplId) { setCustomText(''); return }
    const tpl = templates.find(t => t.id === selectedTplId)
    if (tpl) {
      setCustomText(
        tpl.text
          .replace(/\[NAAM\]/g, localLead.contact)
          .replace(/\[NAME\]/g, localLead.contact),
      )
    }
  }, [selectedTplId, localLead.contact, templates])

  async function patch(updates: Partial<Lead>) {
    await fetch('/api/labour-link/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: pipeline, id: lead.id, updates }),
    })
    setLocalLead(prev => ({ ...prev, ...updates }))
    onUpdate(lead.id, updates)
  }

  async function changeType(newType: LeadType) {
    if (newType === localLead.type) return
    setSaving(true)
    const res = await fetch('/api/labour-link/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: pipeline, id: lead.id, updates: { type: newType } }),
    })
    if (res.ok) {
      const movedLead: Lead = await res.json()
      onUpdate(lead.id, { type: newType }, movedLead)
      onClose()
    }
    setSaving(false)
  }

  async function saveDetails() {
    setSaving(true)
    await patch({ notes, blocker, lastContact })
    setSaving(false)
  }

  async function handleChurnReason(reason: string) {
    setChurnReason(reason)
    await patch({ churnReason: reason })
  }

  async function handleRemove() {
    if (!confirmRemove) { setConfirmRemove(true); return }
    setRemoving(true)
    await fetch(`/api/labour-link/leads?type=${pipeline}&id=${lead.id}`, { method: 'DELETE' })
    onRemove?.()
    onClose()
  }

  async function copyText() {
    if (!customText.trim()) return
    await navigator.clipboard.writeText(customText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveLog() {
    if (!logOutcome) return
    setSavingLog(true)
    const selectedTpl = templates.find(t => t.id === selectedTplId)
    const timestamp = logDate ? new Date(logDate).getTime() : Date.now()
    const res = await fetch('/api/labour-link/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId:        lead.id,
        templateId:    selectedTplId || undefined,
        templateLabel: selectedTpl?.label,
        text:          customText,
        outcome:       logOutcome,
        notes:         logNotes,
        timestamp,
      }),
    })
    if (res.ok) {
      const entry: WAInteraction = await res.json()
      setInteractions(prev => [entry, ...prev])
      setLogOpen(false)
      setLogOutcome('')
      setLogNotes('')
      setLogDate(new Date().toISOString().split('T')[0])
    }
    setSavingLog(false)
  }

  const waUrl = localLead.phone
    ? formatWAUrl(localLead.phone, customText.trim() || defaultTpl.text)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,35,60,0.45)] p-6" onClick={onClose}>
      <div
        className="relative flex max-h-[88vh] w-full max-w-[620px] flex-col rounded-2xl border border-[rgba(0,0,0,0.14)] bg-white font-[family-name:var(--font-dm-mono)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[rgba(0,0,0,0.08)] p-6 pb-4">
          <button onClick={onClose} className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] text-gray-400 hover:text-gray-700">
            <X size={14} />
          </button>
          <h2 className="font-[family-name:var(--font-syne)] text-[20px] font-bold text-gray-900">{localLead.name}</h2>
          <p className="text-[12px] text-gray-400">{localLead.contact} · {localLead.phone || 'no number'} · {localLead.area}</p>

          {/* Tabs */}
          <div className="mt-3 flex gap-1">
            {(['details', 'whatsapp'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition-all',
                  tab === t ? 'bg-[#3a6bef] text-white' : 'border border-[rgba(0,0,0,0.1)] text-gray-500 hover:bg-[#f5f6f8]'
                )}>
                {t === 'whatsapp' ? '💬 WhatsApp' : t}
                {t === 'whatsapp' && interactions.length > 0 && (
                  <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
                    tab === t ? 'bg-white/20' : 'bg-[#f0f2f5] text-gray-500'
                  )}>{interactions.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Details tab ─────────────────────────────────────────────────── */}
          {tab === 'details' && (
            <div className="space-y-5">
              {/* Pipeline (type) pills */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Pipeline</p>
                <div className="flex gap-2">
                  {(['ll', 'sl', 'kiepersol'] as LeadType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => changeType(t)}
                      disabled={saving}
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] transition-all disabled:opacity-50',
                        localLead.type === t
                          ? 'border-[#3a6bef] bg-[rgba(58,107,239,0.1)] text-[#3a6bef]'
                          : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:border-[#3a6bef] hover:text-[#3a6bef]',
                      )}
                    >
                      {PIPELINE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage pills */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Stage</p>
                <div className="flex flex-wrap gap-2">
                  {stages.map(s => (
                    <button key={s} onClick={() => patch({ stage: s })}
                      className={cn('rounded-full border px-3 py-1 text-[11px] transition-all',
                        localLead.stage === s
                          ? 'border-current bg-current/10'
                          : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:border-[#3a6bef] hover:text-[#3a6bef]',
                      )}
                      style={localLead.stage === s ? { borderColor: STAGE_COLORS[s], color: STAGE_COLORS[s], background: `${STAGE_COLORS[s]}18` } : {}}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {localLead.stage === 'Churned' && (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Churn Reason</p>
                  <select
                    value={churnReason}
                    onChange={e => handleChurnReason(e.target.value)}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-600 focus:border-[#9ca3af] focus:outline-none"
                  >
                    <option value="">— Select reason —</option>
                    {CHURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              {localLead.blocker && localLead.stage !== 'Churned' && (
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">Current Blocker</p>
                  <p className="text-[12px] text-[#d4860a]">⚠ {localLead.blocker}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Notes</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="What was discussed, next steps..."
                  className="w-full resize-y rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-3 text-[12px] focus:border-[#3a6bef] focus:outline-none focus:ring-2 focus:ring-[rgba(58,107,239,0.08)]" />
                <input type="text" value={blocker} onChange={e => setBlocker(e.target.value)}
                  placeholder="Current blocker..."
                  className="mt-2 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none" />
              </div>

              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Last Contact</p>
                <input type="date" value={lastContact} onChange={e => setLastContact(e.target.value)}
                  className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none" />
              </div>

              <button onClick={saveDetails} disabled={saving}
                className="rounded-lg bg-[#3a6bef] px-4 py-1.5 text-[12px] text-white hover:opacity-85 disabled:opacity-50 transition-opacity">
                {saving ? 'Saving…' : 'Save'}
              </button>

              {onRemove && (
                <div className="border-t border-[rgba(0,0,0,0.06)] pt-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className={cn(
                        'rounded-lg border px-4 py-1.5 text-[12px] transition-all disabled:opacity-50',
                        confirmRemove
                          ? 'border-[#d93f3f] bg-[#d93f3f] text-white'
                          : 'border-[rgba(217,63,63,0.4)] text-[#d93f3f] hover:bg-[rgba(217,63,63,0.06)]',
                      )}
                    >
                      {removing ? 'Removing…' : confirmRemove ? 'Confirm Remove?' : 'Remove Lead'}
                    </button>
                    {confirmRemove && (
                      <button onClick={() => setConfirmRemove(false)} className="text-[11px] text-gray-400 hover:text-gray-600">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── WhatsApp tab ─────────────────────────────────────────────────── */}
          {tab === 'whatsapp' && (
            <div className="flex flex-col gap-5">
              {!localLead.phone && (
                <p className="rounded-lg bg-[rgba(212,134,10,0.08)] p-3 text-[12px] text-[#d4860a]">
                  No phone number saved for this lead. Add one in the Details tab first.
                </p>
              )}

              {/* ── Interaction history ── */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Interaction History</p>
                {loadingHistory && (
                  <p className="text-center text-[11px] text-gray-400 py-3">Loading…</p>
                )}
                {!loadingHistory && interactions.length === 0 && (
                  <p className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-[#f5f6f8] p-4 text-center text-[11px] text-gray-400">
                    No interactions logged yet.
                  </p>
                )}
                {interactions.length > 0 && (
                  <div className="space-y-2">
                    {interactions.map(entry => {
                      const outcome = OUTCOME_OPTIONS.find(o => o.value === entry.outcome)
                      return (
                        <div key={entry.id} className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {outcome && (
                                <span
                                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                                  style={{ color: outcome.color, borderColor: `${outcome.color}40`, background: `${outcome.color}12` }}
                                >
                                  {outcome.label}
                                </span>
                              )}
                              {entry.templateLabel && (
                                <span className="rounded-full bg-[#f0f2f5] px-2 py-0.5 text-[10px] text-gray-500">
                                  {entry.templateLabel}
                                </span>
                              )}
                            </div>
                            <span
                              className="shrink-0 text-[10px] text-gray-400"
                              title={new Date(entry.timestamp).toLocaleString('en-ZA')}
                            >
                              {relativeTime(entry.timestamp)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="mt-1.5 text-[11px] text-gray-500 line-clamp-2">{entry.notes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Compose ── */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Send Message</p>
                <select
                  value={selectedTplId}
                  onChange={e => setSelectedTplId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-600 focus:border-[#3a6bef] focus:outline-none"
                >
                  <option value="">— Compose custom message —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <textarea
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  rows={6}
                  placeholder="Select a template above, or type a custom message…"
                  className="w-full resize-y rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-3 text-[12px] focus:border-[#3a6bef] focus:outline-none"
                />

                {/* Action buttons */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={copyText}
                    disabled={!customText.trim()}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all disabled:opacity-40',
                      copied
                        ? 'border-[rgba(24,168,107,0.4)] bg-[rgba(24,168,107,0.1)] text-[#18a86b]'
                        : 'border-[rgba(0,0,0,0.12)] bg-white text-gray-600 hover:bg-[#f5f6f8]',
                    )}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>

                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.1)] px-3 py-2 text-[12px] font-medium text-[#18a86b] hover:bg-[rgba(37,211,102,0.18)] transition-colors"
                    >
                      <MessageCircle size={12} /> Open in WhatsApp
                    </a>
                  )}

                  <button
                    onClick={() => setLogOpen(v => !v)}
                    className={cn(
                      'ml-auto rounded-lg border px-3 py-2 text-[11px] transition-all',
                      logOpen
                        ? 'border-[#3a6bef] bg-[rgba(58,107,239,0.08)] text-[#3a6bef]'
                        : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:bg-[#f5f6f8]',
                    )}
                  >
                    {logOpen ? 'Cancel log' : '📝 Log interaction'}
                  </button>
                </div>
              </div>

              {/* ── Log interaction panel ── */}
              {logOpen && (
                <div className="rounded-xl border border-[rgba(58,107,239,0.2)] bg-[rgba(58,107,239,0.03)] p-4">
                  <p className="mb-3 text-[10px] uppercase tracking-widest text-gray-400">Log this Interaction</p>

                  {/* Outcome pills */}
                  <div className="mb-3">
                    <p className="mb-1.5 text-[11px] text-gray-500">Outcome *</p>
                    <div className="flex flex-wrap gap-1.5">
                      {OUTCOME_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setLogOutcome(o.value)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] transition-all',
                            logOutcome === o.value
                              ? 'border-current font-medium'
                              : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:bg-[#f5f6f8]',
                          )}
                          style={logOutcome === o.value
                            ? { borderColor: o.color, color: o.color, background: `${o.color}12` }
                            : {}}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="mb-3">
                    <p className="mb-1 text-[11px] text-gray-500">Date</p>
                    <input
                      type="date"
                      value={logDate}
                      onChange={e => setLogDate(e.target.value)}
                      className="rounded-lg border border-[rgba(0,0,0,0.12)] bg-white p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none"
                    />
                  </div>

                  {/* Template used (read-only label) */}
                  {selectedTplId && (
                    <div className="mb-3">
                      <p className="mb-1 text-[11px] text-gray-500">Template sent</p>
                      <p className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white px-3 py-2 text-[11px] text-gray-600">
                        {templates.find(t => t.id === selectedTplId)?.label ?? selectedTplId}
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mb-3">
                    <p className="mb-1 text-[11px] text-gray-500">Notes (optional)</p>
                    <textarea
                      value={logNotes}
                      onChange={e => setLogNotes(e.target.value)}
                      rows={2}
                      placeholder="Any context or next steps…"
                      className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.12)] bg-white p-2.5 text-[12px] focus:border-[#3a6bef] focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={saveLog}
                    disabled={!logOutcome || savingLog}
                    className="rounded-lg bg-[#3a6bef] px-4 py-1.5 text-[12px] text-white hover:opacity-85 disabled:opacity-50 transition-opacity"
                  >
                    {savingLog ? 'Saving…' : 'Save Log'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
