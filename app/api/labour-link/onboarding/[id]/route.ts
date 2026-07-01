import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOnboardingRecords, upsertOnboardingRecord, deleteOnboardingRecord, updateLead } from '@/lib/ll-db'
import type { SLOnboardingRecord } from '@/lib/ll-types'

function calcMRR(adminCount: number) {
  return adminCount <= 10 ? 600 : 600 + (adminCount - 10) * 60
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates: Partial<SLOnboardingRecord> = await req.json()

  const records = await getOnboardingRecords()
  const record = records.find(r => r.id === id)
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = { ...record, ...updates, id, updatedAt: new Date().toISOString() }
  await upsertOnboardingRecord(updated)

  // Sync the linked SL pipeline lead when stage changes
  if (updates.stage && record.leadId) {
    const today = new Date().toISOString().slice(0, 10)

    if (updates.stage === 'onboarded') {
      const adminCount = updated.admins.length
      const mrr = calcMRR(adminCount)
      await updateLead('sl', record.leadId, {
        stage: 'Active Client',
        revenue: mrr,
        lastContact: today,
        notes: `SafeLink onboarded ${today}. ${adminCount} admins. R${mrr}/mo.`,
        blocker: '',
      })
    } else {
      // Keep lastContact fresh as onboarding progresses
      await updateLead('sl', record.leadId, { lastContact: today })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await deleteOnboardingRecord(id)
  return NextResponse.json({ ok: true })
}
