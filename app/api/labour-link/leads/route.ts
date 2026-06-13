import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLeads, updateLead, setLeads } from '@/lib/ll-db'
import type { Lead, LeadType } from '@/lib/ll-types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const type = (req.nextUrl.searchParams.get('type') ?? 'll') as LeadType
  const leads = await getLeads(type)
  return NextResponse.json(leads)
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { type, id, updates } = body as { type: LeadType; id: string; updates: Record<string, unknown> }

  if (!type || !id || !updates) {
    return NextResponse.json({ error: 'Missing type, id or updates' }, { status: 400 })
  }

  const updated = await updateLead(type, id, updates)
  if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  return NextResponse.json(updated)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { type, lead } = body as { type: LeadType; lead: Omit<Lead, 'id' | 'type'> }

  if (!type || !lead?.name) {
    return NextResponse.json({ error: 'Missing type or lead name' }, { status: 400 })
  }

  const leads = await getLeads(type)
  const newLead: Lead = {
    id: `${type}-${Date.now()}`,
    type,
    name: lead.name,
    contact: lead.contact ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    area: lead.area ?? 'Limpopo',
    stage: lead.stage ?? 'New Lead',
    notes: lead.notes ?? '',
    lastContact: '',
    priority: lead.priority ?? 'medium',
    blocker: '',
  }
  await setLeads(type, [...leads, newLead])

  return NextResponse.json(newLead, { status: 201 })
}
