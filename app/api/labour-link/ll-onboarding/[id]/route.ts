import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getLLOnboardingRecords, upsertLLOnboardingRecord, deleteLLOnboardingRecord, updateLead } from '@/lib/ll-db'
import type { LLOnboardingRecord } from '@/lib/ll-types'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates: Partial<LLOnboardingRecord> = await req.json()

  const records = await getLLOnboardingRecords()
  const record = records.find(r => r.id === id)
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = { ...record, ...updates, id, updatedAt: new Date().toISOString() }
  await upsertLLOnboardingRecord(updated)

  const today = new Date().toISOString().slice(0, 10)

  if (updates.activeClientConfirmed && record.leadId) {
    // Explicit confirm: move the LL pipeline lead to Active Client
    await updateLead('ll', record.leadId, {
      stage: 'Active Client',
      revenue: 0,
      lastContact: today,
      notes: `Labour Link onboarded ${today}. ${updated.staffCount ?? 0} staff loaded.`,
      blocker: '',
    })
  } else if (updates.stage && record.leadId) {
    // Keep lastContact fresh as stages advance or go back
    await updateLead('ll', record.leadId, { lastContact: today })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteLLOnboardingRecord(id)
  return NextResponse.json({ ok: true })
}
