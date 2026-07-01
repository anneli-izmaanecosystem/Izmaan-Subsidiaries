import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { wa, appendMessage } from '@/lib/ll-whatsapp'
import { updateLead } from '@/lib/ll-db'
import type { LeadType } from '@/lib/ll-types'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!wa.configured) {
    return NextResponse.json(
      { error: 'WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.' },
      { status: 503 },
    )
  }

  const { leadId, leadType, phone, text } = await req.json() as {
    leadId: string
    leadType: LeadType
    phone: string
    text: string
  }

  if (!phone || !text || !leadId) {
    return NextResponse.json({ error: 'Missing phone, text or leadId' }, { status: 400 })
  }

  const result = await wa.sendText(phone, text)

  if (result.error) {
    return NextResponse.json({ error: result.error.message ?? 'Meta API error' }, { status: 502 })
  }

  const waMessageId: string = result.messages?.[0]?.id ?? ''
  const today = new Date().toISOString().split('T')[0]

  await Promise.all([
    appendMessage({
      id: crypto.randomUUID(),
      direction: 'outbound',
      text,
      timestamp: Date.now(),
      status: 'sent',
      waMessageId,
      leadId,
    }),
    updateLead(leadType, leadId, { lastContact: today }),
  ])

  return NextResponse.json({ ok: true, waMessageId })
}
