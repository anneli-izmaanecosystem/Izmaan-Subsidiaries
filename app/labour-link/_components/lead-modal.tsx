'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Send, CheckCheck, Check, Clock } from 'lucide-react'
import type { Lead, LeadStage, LeadType } from '@/lib/ll-types'
import type { WAMessage } from '@/lib/ll-whatsapp'
import { getTemplateForStage, formatWAUrl, TEMPLATES } from '@/lib/ll-templates'
import { cn } from '@/lib/utils'

const STAGES_LL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Active Client']
const STAGES_SL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Implementing', 'Active Client']
const STAGE_COLORS: Record<string, string> = {
  'New Lead':      '#7a8199',
  'Contacted':     '#3a6bef',
  'Meeting Done':  '#7c50d8',
  'Onboarding':    '#d4860a',
  'Implementing':  '#d4860a',
  'Active Client': '#18a86b',
}

function StatusIcon({ status }: { status: WAMessage['status'] }) {
  if (status === 'read')      return <CheckCheck size={11} className="text-[#3a6bef]" />
  if (status === 'delivered') return <CheckCheck size={11} className="text-gray-400" />
  if (status === 'sent')      return <Check size={11} className="text-gray-400" />
  if (status === 'failed')    return <span className="text-[10px] text-[#d93f3f]">failed</span>
  return <Clock size={11} className="text-gray-300" />
}

interface Props {
  lead: Lead
  pipeline: 'll' | 'sl'
  waConfigured?: boolean
  onClose: () => void
  onUpdate: (id: string, updates: Partial<Lead>) => void
}

export function LeadModal({ lead, pipeline, waConfigured, onClose, onUpdate }: Props) {
  const [localLead, setLocalLead] = useState(lead)
  const [notes, setNotes] = useState(lead.notes)
  const [blocker, setBlocker] = useState(lead.blocker)
  const [lastContact, setLastContact] = useState(lead.lastContact)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'details' | 'whatsapp'>('details')

  // WhatsApp tab state
  const [messages, setMessages] = useState<WAMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [selectedTplId, setSelectedTplId] = useState<string>('')
  const [customText, setCustomText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const stages = pipeline === 'll' ? STAGES_LL : STAGES_SL
  const defaultTpl = getTemplateForStage(localLead.stage, pipeline, localLead.contact)
  const waFallbackUrl = localLead.phone ? formatWAUrl(localLead.phone, defaultTpl.text) : null

  useEffect(() => {
    if (tab !== 'whatsapp') return
    setLoadingMsgs(true)
    fetch(`/api/labour-link/whatsapp/messages?leadId=${lead.id}`)
      .then(r => r.json())
      .then((data: WAMessage[]) => setMessages(data.sort((a, b) => a.timestamp - b.timestamp)))
      .finally(() => setLoadingMsgs(false))
  }, [tab, lead.id])

  // Populate message box when template is selected
  useEffect(() => {
    if (!selectedTplId) { setCustomText(''); return }
    const tpl = TEMPLATES.find(t => t.id === selectedTplId)
    if (tpl) {
      setCustomText(tpl.text.replace(/\[NAAM\]/g, localLead.contact).replace(/\[NAME\]/g, localLead.contact))
    }
  }, [selectedTplId, localLead.contact])

  async function patch(updates: Partial<Lead>) {
    await fetch('/api/labour-link/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: pipeline, id: lead.id, updates }),
    })
    setLocalLead(prev => ({ ...prev, ...updates }))
    onUpdate(lead.id, updates)
  }

  async function saveDetails() {
    setSaving(true)
    await patch({ notes, blocker, lastContact })
    setSaving(false)
  }

  async function sendMessage() {
    if (!customText.trim() || !localLead.phone) return
    setSending(true); setSendError('')
    const res = await fetch('/api/labour-link/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        leadType: pipeline as LeadType,
        phone: localLead.phone,
        text: customText,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSendError(data.error ?? 'Failed to send')
    } else {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), direction: 'outbound', text: customText,
        timestamp: Date.now(), status: 'sent', waMessageId: data.waMessageId, leadId: lead.id,
      }])
      setCustomText(''); setSelectedTplId('')
      const today = new Date().toISOString().split('T')[0]
      setLocalLead(prev => ({ ...prev, lastContact: today }))
      setLastContact(today)
    }
    setSending(false)
  }

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
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <div className="space-y-5">
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

              {localLead.blocker && (
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
            </div>
          )}

          {tab === 'whatsapp' && (
            <div className="flex flex-col gap-4">
              {!localLead.phone && (
                <p className="rounded-lg bg-[rgba(212,134,10,0.08)] p-3 text-[12px] text-[#d4860a]">
                  No phone number saved for this lead. Add one in the Details tab first.
                </p>
              )}

              {/* Message log */}
              <div className="max-h-[240px] overflow-y-auto rounded-xl border border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] p-3">
                {loadingMsgs && <p className="text-center text-[11px] text-gray-400">Loading…</p>}
                {!loadingMsgs && messages.length === 0 && (
                  <p className="text-center text-[11px] text-gray-400">No messages yet.</p>
                )}
                <div className="space-y-2">
                  {messages.map(m => (
                    <div key={m.id} className={cn('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-[12px]',
                        m.direction === 'outbound' ? 'bg-[#3a6bef] text-white' : 'bg-white border border-[rgba(0,0,0,0.08)] text-gray-800'
                      )}>
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]',
                          m.direction === 'outbound' ? 'text-white/60' : 'text-gray-400'
                        )}>
                          <span>{new Date(m.timestamp).toLocaleTimeString('en-ZA', { hour:'2-digit', minute:'2-digit' })}</span>
                          {m.direction === 'outbound' && <StatusIcon status={m.status} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compose */}
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-widest text-gray-400">Send Message</p>
                <select value={selectedTplId} onChange={e => setSelectedTplId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-600 focus:border-[#3a6bef] focus:outline-none">
                  <option value="">— Compose custom message —</option>
                  {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={5}
                  placeholder="Type a message or select a template above..."
                  className="w-full resize-y rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-3 text-[12px] focus:border-[#3a6bef] focus:outline-none" />
                {sendError && <p className="mt-1 text-[11px] text-[#d93f3f]">{sendError}</p>}
                <div className="mt-2 flex items-center gap-2">
                  {waConfigured ? (
                    <button onClick={sendMessage} disabled={sending || !customText.trim() || !localLead.phone}
                      className="flex items-center gap-1.5 rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                      <Send size={12} /> {sending ? 'Sending…' : 'Send via API'}
                    </button>
                  ) : (
                    waFallbackUrl && (
                      <a href={customText.trim() ? formatWAUrl(localLead.phone, customText) : waFallbackUrl}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.1)] px-4 py-2 text-[12px] text-[#18a86b] hover:bg-[rgba(37,211,102,0.18)] transition-colors">
                        <MessageCircle size={12} /> Open in WhatsApp
                      </a>
                    )
                  )}
                  {!waConfigured && (
                    <span className="text-[11px] text-gray-400">API not configured — opens WhatsApp app</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
