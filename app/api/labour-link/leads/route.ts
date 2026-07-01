import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getLeads, updateLead, setLeads, moveLead,
  getOnboardingRecords, upsertOnboardingRecord,
  getLLOnboardingRecords, upsertLLOnboardingRecord,
} from '@/lib/ll-db'
import type { Lead, LeadType, SLOnboardingRecord, LLOnboardingRecord } from '@/lib/ll-types'

async function maybeCreateOnboardingRecord(lead: Lead) {
  const now = new Date().toISOString()

  // SL lead → Implementing: create SafeLink onboarding record
  if (lead.type === 'sl' && lead.stage === 'Implementing') {
    const records = await getOnboardingRecords()
    if (records.find(r => r.leadId === lead.id)) return
    const record: SLOnboardingRecord = {
      id: `sl-ob-${lead.id}`,
      orgName: lead.name,
      district: lead.area ?? '',
      contactName: lead.contact ?? '',
      contactPhone: lead.phone ?? '',
      stage: 'info-requested',
      admins: [],
      notes: lead.notes ?? '',
      createdAt: now,
      updatedAt: now,
      leadId: lead.id,
    }
    await upsertOnboardingRecord(record)
  }

  // LL lead → Onboarding: create Labour Link onboarding record
  if (lead.type === 'll' && lead.stage === 'Onboarding') {
    const records = await getLLOnboardingRecords()
    if (records.find(r => r.leadId === lead.id)) return
    const record: LLOnboardingRecord = {
      id: `ll-ob-${lead.id}`,
      farmName: lead.name,
      area: lead.area ?? '',
      contactName: lead.contact ?? '',
      contactPhone: lead.phone ?? '',
      contactEmail: lead.email ?? '',
      billingAddress: '',
      pinLocation: '',
      staffCount: 0,
      csvReceived: false,
      stage: 'info-requested',
      notes: lead.notes ?? '',
      createdAt: now,
      updatedAt: now,
      leadId: lead.id,
    }
    await upsertLLOnboardingRecord(record)
  }
}

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

  const newType = updates.type as LeadType | undefined
  if (newType && newType !== type) {
    const moved = await moveLead(type, newType, id)
    if (!moved) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    await maybeCreateOnboardingRecord(moved)
    return NextResponse.json(moved)
  }

  const updated = await updateLead(type, id, updates)
  if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  await maybeCreateOnboardingRecord(updated)
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
  await maybeCreateOnboardingRecord(newLead)

  return NextResponse.json(newLead, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') as LeadType
  const id   = req.nextUrl.searchParams.get('id')
  if (!type || !id) return NextResponse.json({ error: 'Missing type or id' }, { status: 400 })

  const leads    = await getLeads(type)
  const filtered = leads.filter(l => l.id !== id)
  if (filtered.length === leads.length) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  await setLeads(type, filtered)
  return NextResponse.json({ ok: true })
}
