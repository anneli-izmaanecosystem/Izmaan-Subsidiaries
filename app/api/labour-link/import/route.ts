import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getLeads, setLeads } from '@/lib/ll-db'
import type { Lead, LeadStage, Priority, LeadType } from '@/lib/ll-types'

const VALID_STAGES = new Set<string>([
  'New Lead', 'Contacted', 'Meeting Done', 'Onboarding', 'Implementing', 'Active Client',
])
const VALID_PRIORITIES = new Set<string>(['high', 'medium', 'low'])
const VALID_TYPES = new Set<string>(['ll', 'sl', 'kiepersol'])

function toStage(s: string): LeadStage {
  const val = s.trim()
  return VALID_STAGES.has(val) ? (val as LeadStage) : 'New Lead'
}
function toPriority(s: string): Priority {
  const val = s.trim().toLowerCase()
  return VALID_PRIORITIES.has(val) ? (val as Priority) : 'medium'
}
function toType(s: string): LeadType {
  const val = s.trim().toLowerCase()
  return VALID_TYPES.has(val) ? (val as LeadType) : 'll'
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { rows } = await req.json() as { rows: Record<string, string>[] }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Group by type then batch-write
  const byType: Record<LeadType, Lead[]> = { ll: [], sl: [], kiepersol: [] }
  const errors: string[] = []

  rows.forEach((r, i) => {
    if (!r.name?.trim()) { errors.push(`Row ${i + 2}: missing name`); return }
    const type = toType(r.type ?? 'll')
    byType[type].push({
      id: `${type}-import-${Date.now()}-${i}`,
      type,
      name: r.name.trim(),
      contact: r.contact?.trim() ?? '',
      phone: r.phone?.trim() ?? '',
      email: r.email?.trim() ?? '',
      area: r.area?.trim() || 'Limpopo',
      stage: toStage(r.stage ?? 'New Lead'),
      priority: toPriority(r.priority ?? 'medium'),
      notes: r.notes?.trim() ?? '',
      blocker: r.blocker?.trim() ?? '',
      lastContact: '',
      contacted: false,
    })
  })

  let imported = 0
  for (const type of (['ll', 'sl', 'kiepersol'] as LeadType[])) {
    if (byType[type].length === 0) continue
    const existing = await getLeads(type)
    await setLeads(type, [...existing, ...byType[type]])
    imported += byType[type].length
  }

  return NextResponse.json({ imported, errors })
}
