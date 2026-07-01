import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTemplates, upsertTemplate, deleteTemplate } from '@/lib/ll-db'
import type { Template } from '@/lib/ll-templates'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const templates = await getTemplates()
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { label?: string; text?: string }
  if (!body.label?.trim() || !body.text?.trim()) {
    return NextResponse.json({ error: 'label and text are required' }, { status: 400 })
  }

  const template: Template = {
    id: `tpl-${Date.now()}`,
    label: body.label.trim(),
    text: body.text.trim(),
  }
  await upsertTemplate(template)
  return NextResponse.json(template, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json() as { id?: string; label?: string; text?: string }
  if (!body.id || !body.label?.trim() || !body.text?.trim()) {
    return NextResponse.json({ error: 'id, label and text are required' }, { status: 400 })
  }

  const template: Template = { id: body.id, label: body.label.trim(), text: body.text.trim() }
  await upsertTemplate(template)
  return NextResponse.json(template)
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  await deleteTemplate(id)
  return NextResponse.json({ ok: true })
}
