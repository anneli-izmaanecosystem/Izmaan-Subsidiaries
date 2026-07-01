'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import type { Lead } from '@/lib/ll-types'
import { formatWAUrl } from '@/lib/ll-templates'

interface Props { client: Lead }

const CHECK_IN_TEMPLATE = (name: string) =>
  `Hallo ${name || '[NAAM]'},\n\nEk hoop julle geniet Labour Link! Net 'n vinnige toets — gebruik julle die stelsel al en is daar enige iets waarmee ek kan help?\n\nMara — Labour Link`

export function ClientCard({ client: initial }: Props) {
  const [client, setClient] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [revenue, setRevenue] = useState(String(initial.revenue ?? 0))
  const [notes, setNotes] = useState(initial.notes)
  const [saving, setSaving] = useState(false)

  function daysSince(d: string) {
    if (!d) return null
    return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  }

  async function save() {
    setSaving(true)
    const updates = { revenue: Number(revenue), notes }
    const res = await fetch('/api/labour-link/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'll', id: client.id, updates }),
    })
    if (res.ok) { setClient(prev => ({ ...prev, ...updates })); setEditing(false) }
    setSaving(false)
  }

  const days = daysSince(client.lastContact)
  const waUrl = client.phone
    ? formatWAUrl(client.phone, CHECK_IN_TEMPLATE(client.contact))
    : null

  return (
    <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-5 font-[family-name:var(--font-dm-mono)]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-[family-name:var(--font-syne)] text-[14px] font-bold text-gray-900">{client.name}</h3>
          <p className="text-[11px] text-gray-400">{client.contact}</p>
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-syne)] text-[18px] font-bold text-[#18a86b]">
            R{(client.revenue ?? 0).toLocaleString('en-ZA')}
          </p>
          <p className="text-[10px] text-gray-400">/month</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="mb-3 space-y-1">
        {client.phone && <p className="text-[11px] text-[#3a6bef]">📱 {client.phone}</p>}
        {client.email && <p className="text-[11px] text-gray-400">✉ {client.email}</p>}
        {days !== null && (
          <p className="text-[11px] text-gray-400">
            Last contact: {days === 0 ? 'today' : `${days}d ago`}
            {days > 30 && <span className="ml-1 text-[#d93f3f]">⚠ overdue check-in</span>}
          </p>
        )}
      </div>

      {/* Notes */}
      {!editing && (
        <p className="mb-3 text-[11px] text-gray-500 line-clamp-2">{client.notes || '—'}</p>
      )}

      {editing && (
        <div className="mb-3 space-y-2">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">Monthly Revenue (R)</label>
            <input
              type="number"
              value={revenue}
              onChange={e => setRevenue(e.target.value)}
              className="w-full rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2 text-[12px] focus:border-[#3a6bef] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-gray-400">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.12)] bg-[#f5f6f8] p-2 text-[12px] focus:border-[#3a6bef] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-[#3a6bef] px-3 py-1.5 text-[11px] text-white hover:opacity-85 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-[rgba(0,0,0,0.12)] px-3 py-1.5 text-[11px] text-gray-500 hover:bg-[#f5f6f8]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-[11px] text-[#3a6bef] hover:underline"
          >
            Edit
          </button>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-md border border-[rgba(37,211,102,0.3)] bg-[rgba(37,211,102,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#18a86b] hover:bg-[rgba(37,211,102,0.16)] transition-colors"
            >
              <MessageCircle size={10} />
              Check-in
            </a>
          )}
        </div>
      )}
    </div>
  )
}
