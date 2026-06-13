'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus } from 'lucide-react'
import type { LeadStage, Priority } from '@/lib/ll-types'
import { cn } from '@/lib/utils'

const STAGES_LL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Active Client']
const STAGES_SL: LeadStage[] = ['New Lead', 'Contacted', 'Meeting Done', 'Implementing', 'Active Client']

export function AddLeadModal() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'ll' | 'sl'>('ll')
  const [form, setForm] = useState({
    name: '', contact: '', phone: '', email: '',
    area: 'Limpopo', stage: 'New Lead' as LeadStage,
    priority: 'medium' as Priority, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/labour-link/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, lead: form }),
    })
    setSaving(false)
    setOpen(false)
    setForm({ name: '', contact: '', phone: '', email: '', area: 'Limpopo', stage: 'New Lead', priority: 'medium', notes: '' })
    router.refresh()
  }

  const stages = type === 'll' ? STAGES_LL : STAGES_SL

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-[#3a6bef] px-3 py-2 text-[12px] font-medium text-white hover:opacity-90 transition-opacity"
      >
        <Plus size={14} />
        Add Lead
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(30,35,60,0.45)] p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-[520px] rounded-2xl border border-[rgba(0,0,0,0.14)] bg-white p-7 font-[family-name:var(--font-dm-mono)]"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f5f6f8] text-gray-400 hover:text-gray-700"
            >
              <X size={14} />
            </button>

            <h2 className="mb-5 font-[family-name:var(--font-syne)] text-[18px] font-bold text-gray-900">
              Add New Lead
            </h2>

            <form onSubmit={submit} className="space-y-4">
              {/* Pipeline type */}
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Pipeline</label>
                <div className="flex gap-2">
                  {(['ll', 'sl'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setType(t); set('stage', 'New Lead') }}
                      className={cn(
                        'rounded-lg border px-4 py-1.5 text-[12px] font-medium transition-all',
                        type === t
                          ? 'border-[#3a6bef] bg-[rgba(58,107,239,0.1)] text-[#3a6bef]'
                          : 'border-[rgba(0,0,0,0.12)] text-gray-500 hover:bg-[#f5f6f8]',
                      )}
                    >
                      {t === 'll' ? 'Labour Link' : 'Safe Link'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">
                  Farm / Company Name <span className="text-[#d93f3f]">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Groot Boerdery"
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none focus:ring-2 focus:ring-[rgba(58,107,239,0.08)]"
                />
              </div>

              {/* Contact + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Contact Person</label>
                  <input
                    value={form.contact}
                    onChange={e => set('contact', e.target.value)}
                    placeholder="e.g. Johan Botha"
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">WhatsApp / Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    placeholder="082 000 0000"
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  />
                </div>
              </div>

              {/* Email + Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="info@example.co.za"
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Area</label>
                  <input
                    value={form.area}
                    onChange={e => set('area', e.target.value)}
                    placeholder="Limpopo"
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  />
                </div>
              </div>

              {/* Stage + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Stage</label>
                  <select
                    value={form.stage}
                    onChange={e => set('stage', e.target.value)}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  >
                    {stages.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => set('priority', e.target.value)}
                    className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-gray-400">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  placeholder="How you found them, referral, context..."
                  className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2.5 text-[12px] text-gray-900 focus:border-[#3a6bef] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex-1 rounded-lg bg-[#3a6bef] py-2 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? 'Adding…' : 'Add Lead'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[rgba(0,0,0,0.12)] px-4 py-2 text-[12px] text-gray-500 hover:bg-[#f5f6f8]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
