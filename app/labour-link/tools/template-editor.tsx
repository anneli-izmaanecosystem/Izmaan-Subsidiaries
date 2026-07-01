'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Template } from '@/lib/ll-templates'

interface Props {
  template: Template | null  // null = new template
  onSave: (t: Template) => void
  onClose: () => void
}

export function TemplateEditor({ template, onSave, onClose }: Props) {
  const [label, setLabel] = useState(template?.label ?? '')
  const [text, setText] = useState(template?.text ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLabel(template?.label ?? '')
    setText(template?.text ?? '')
    setError('')
  }, [template])

  async function handleSave() {
    if (!label.trim() || !text.trim()) { setError('Both fields are required.'); return }
    setSaving(true)
    setError('')

    try {
      const isNew = !template
      const res = await fetch('/api/labour-link/templates', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template?.id, label: label.trim(), text: text.trim() }),
      })
      if (!res.ok) throw new Error('Save failed')
      const saved: Template = await res.json()
      onSave(saved)
    } catch {
      setError('Could not save template. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[rgba(0,0,0,0.1)] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.07)] px-5 py-4">
          <p className="font-[family-name:var(--font-syne)] text-[15px] font-bold text-gray-900">
            {template ? 'Edit Template' : 'New Template'}
          </p>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-gray-400">
              Label
            </label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Initial Outreach — Labour Link (Afrikaans)"
              className="w-full rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 text-[12px] text-gray-800 outline-none focus:border-[#3a6bef] focus:ring-2 focus:ring-[rgba(58,107,239,0.15)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-gray-400">
              Message
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={12}
              placeholder="Type your WhatsApp message here..."
              className="w-full resize-none rounded-lg border border-[rgba(0,0,0,0.1)] px-3 py-2 font-[family-name:var(--font-dm-mono)] text-[11px] leading-relaxed text-gray-800 outline-none focus:border-[#3a6bef] focus:ring-2 focus:ring-[rgba(58,107,239,0.15)]"
            />
            <p className="mt-1 text-[10px] text-gray-400">Use [NAAM] or [NAME] as a name placeholder.</p>
          </div>

          {error && <p className="text-[11px] text-[#d93f3f]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-[rgba(0,0,0,0.07)] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-[rgba(0,0,0,0.1)] px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#3a6bef] px-4 py-2 text-[12px] font-medium text-white hover:bg-[#2d5cd8] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}
