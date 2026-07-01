'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import type { ActionItem, Lead } from '@/lib/ll-types'
import { getTemplateForStage, formatWAUrl } from '@/lib/ll-templates'
import { LeadModal } from './lead-modal'
import { cn } from '@/lib/utils'

interface Props {
  actions: ActionItem[]
  initialChecked: Record<string, boolean>
  leads: Lead[]
  waConfigured?: boolean
}

export function ActionList({ actions, initialChecked, leads, waConfigured }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initialChecked)
  const [openLead, setOpenLead] = useState<{ lead: Lead; pipeline: 'll' | 'sl' } | null>(null)
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads)

  async function toggle(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
    await fetch('/api/labour-link/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  function openModal(action: ActionItem) {
    if (!action.leadId || !action.pipeline || action.pipeline === 'kiepersol') return
    const lead = localLeads.find(l => l.id === action.leadId)
    if (lead) setOpenLead({ lead, pipeline: action.pipeline as 'll' | 'sl' })
  }

  function handleLeadUpdate(id: string, updates: Partial<Lead>) {
    setLocalLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    if (openLead?.lead.id === id) {
      setOpenLead(prev => prev ? { ...prev, lead: { ...prev.lead, ...updates } } : null)
    }
  }

  const pending = actions.filter(a => !checked[a.id]).length

  return (
    <>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="font-[family-name:var(--font-syne)] text-sm font-semibold text-gray-900">
            This Week&apos;s Actions
          </span>
          <span className="rounded-full bg-[rgba(58,107,239,0.1)] px-2 py-0.5 text-[10px] font-medium text-[#3a6bef]">
            {pending} pending
          </span>
        </div>

        <div className="space-y-2">
          {actions.length === 0 && (
            <p className="py-4 text-center text-xs text-gray-400">No actions — you&apos;re up to date!</p>
          )}

          {actions.map(a => {
            const done = !!checked[a.id]
            const lead = a.leadId ? localLeads.find(l => l.id === a.leadId) : null
            const pipeline = a.pipeline === 'll' || a.pipeline === 'sl' ? a.pipeline : undefined
            const waUrl =
              lead?.phone && pipeline
                ? formatWAUrl(
                    lead.phone,
                    getTemplateForStage(lead.stage, pipeline, lead.contact).text,
                  )
                : null

            return (
              <div
                key={a.id}
                onClick={() => !done && openModal(a)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-3.5 transition-all',
                  done
                    ? 'opacity-40'
                    : 'hover:border-[rgba(0,0,0,0.14)] hover:shadow-sm',
                )}
              >
                {/* Priority dot */}
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: a.accentColor }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn('text-[13px] font-medium text-gray-900', done && 'line-through')}>
                      {a.title}
                    </span>
                    <span className="rounded-full bg-[rgba(107,114,128,0.1)] px-1.5 py-0.5 text-[10px] text-gray-500">
                      {a.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{a.meta}</p>

                  {/* WhatsApp quick-send */}
                  {waUrl && !done && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#18a86b] hover:bg-[rgba(37,211,102,0.16)] transition-colors"
                    >
                      <MessageCircle size={10} />
                      Send WhatsApp
                    </a>
                  )}
                </div>

                {/* Check circle */}
                <div
                  onClick={e => toggle(e, a.id)}
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] text-[10px] transition-all',
                    done
                      ? 'border-[#18a86b] bg-[#18a86b] text-white'
                      : 'border-gray-300 text-transparent hover:border-[#18a86b]',
                  )}
                >
                  ✓
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {openLead && (
        <LeadModal
          lead={openLead.lead}
          pipeline={openLead.pipeline}
          waConfigured={waConfigured}
          onClose={() => setOpenLead(null)}
          onUpdate={handleLeadUpdate}
        />
      )}
    </>
  )
}
