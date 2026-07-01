'use client'

import { useState } from 'react'
import { Copy, Check, Pencil, Trash2 } from 'lucide-react'

interface Props {
  label: string
  text: string
  onEdit?: () => void
  onDelete?: () => void
}

export function TemplateCard({ label, text, onEdit, onDelete }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">{label}</p>
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              onClick={onEdit}
              title="Edit template"
              className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
            >
              <Pencil size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete template"
              className="rounded p-1 text-gray-300 hover:bg-[rgba(217,63,63,0.08)] hover:text-[#d93f3f]"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <pre className="flex-1 whitespace-pre-wrap text-[11px] leading-relaxed text-gray-800">{text}</pre>
      <button
        onClick={copy}
        className={`mt-4 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium transition-all ${
          copied
            ? 'border-[rgba(24,168,107,0.4)] bg-[rgba(24,168,107,0.15)] text-[#18a86b]'
            : 'border-[rgba(37,211,102,0.25)] bg-[rgba(37,211,102,0.08)] text-[#18a86b] hover:bg-[rgba(37,211,102,0.15)]'
        }`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copied!' : 'Copy for WhatsApp'}
      </button>
    </div>
  )
}
