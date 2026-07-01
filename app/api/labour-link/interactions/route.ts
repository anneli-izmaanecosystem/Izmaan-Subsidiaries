import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getInteractions, addInteraction } from '@/lib/ll-db'
import type { InteractionOutcome, WAInteraction } from '@/lib/ll-types'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leadId = req.nextUrl.searchParams.get('leadId')
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  const interactions = await getInteractions(leadId)
  return NextResponse.json(interactions)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    leadId: string
    templateId?: string
    templateLabel?: string
    text: string
    outcome: InteractionOutcome
    notes: string
    timestamp?: number
  }

  if (!body.leadId || !body.outcome) {
    return NextResponse.json({ error: 'leadId and outcome are required' }, { status: 400 })
  }

  const entry: WAInteraction = {
    id: crypto.randomUUID(),
    leadId: body.leadId,
    timestamp: body.timestamp ?? Date.now(),
    templateId: body.templateId,
    templateLabel: body.templateLabel,
    text: body.text ?? '',
    outcome: body.outcome,
    notes: body.notes ?? '',
  }

  await addInteraction(entry)
  return NextResponse.json(entry, { status: 201 })
}
