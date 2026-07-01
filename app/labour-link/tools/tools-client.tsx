'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Template } from '@/lib/ll-templates'
import { TemplateCard } from './template-card'
import { TemplateEditor } from './template-editor'

interface Props {
  initialTemplates: Template[]
}

export function ToolsClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [editing, setEditing] = useState<Template | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  function openNew() { setEditing(null); setEditorOpen(true) }
  function openEdit(t: Template) { setEditing(t); setEditorOpen(true) }

  function handleSave(saved: Template) {
    setTemplates(prev => {
      const i = prev.findIndex(t => t.id === saved.id)
      if (i === -1) return [...prev, saved]
      const next = [...prev]
      next[i] = saved
      return next
    })
    setEditorOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    const res = await fetch(`/api/labour-link/templates?id=${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-[family-name:var(--font-syne)] text-[14px] font-semibold text-gray-800">
            WhatsApp Templates
          </p>
          <p className="text-[11px] text-gray-400">
            Click Copy to paste into a chat, or use them from the lead card WhatsApp tab
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 rounded-lg bg-[#3a6bef] px-3 py-2 text-[11px] font-medium text-white hover:bg-[#2d5cd8]"
        >
          <Plus size={12} />
          Add Template
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {templates.map(t => (
          <TemplateCard
            key={t.id}
            label={t.label}
            text={t.text}
            onEdit={() => openEdit(t)}
            onDelete={() => handleDelete(t.id)}
          />
        ))}
      </div>

      {editorOpen && (
        <TemplateEditor
          template={editing ?? null}
          onSave={handleSave}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </>
  )
}
