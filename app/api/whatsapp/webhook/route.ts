import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { appendMessage, findLeadIdByPhone, updateMessageStatus } from '@/lib/ll-whatsapp'
import { updateLead } from '@/lib/ll-db'

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// POST — incoming events from Meta
export async function POST(req: NextRequest) {
  // Verify signature
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (appSecret) {
    const sig = req.headers.get('x-hub-signature-256') ?? ''
    const body = await req.text()
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex')
    if (sig !== expected) return new NextResponse('Forbidden', { status: 403 })
    // Re-parse body since we consumed it
    try {
      await handlePayload(JSON.parse(body))
    } catch { /* ignore parse errors */ }
  } else {
    const payload = await req.json()
    await handlePayload(payload)
  }

  // Meta expects a 200 quickly
  return new NextResponse('OK', { status: 200 })
}

type MetaPayload = {
  entry?: {
    changes?: {
      value?: {
        messages?: { from: string; id: string; timestamp: string; text?: { body: string }; type: string }[]
        statuses?: { id: string; recipient_id: string; status: string }[]
      }
    }[]
  }[]
}

async function handlePayload(payload: MetaPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value

      // Incoming messages
      for (const msg of value?.messages ?? []) {
        if (msg.type !== 'text' || !msg.text?.body) continue
        const leadId = await findLeadIdByPhone(msg.from)
        const today = new Date().toISOString().split('T')[0]
        const logLeadId = leadId ?? `unknown-${msg.from}`

        await appendMessage({
          id: crypto.randomUUID(),
          direction: 'inbound',
          text: msg.text.body,
          timestamp: Number(msg.timestamp) * 1000,
          status: 'delivered',
          waMessageId: msg.id,
          leadId: logLeadId,
        })

        // Update last contact if we know which lead sent it
        if (leadId) {
          for (const type of ['ll', 'sl', 'kiepersol'] as const) {
            try { await updateLead(type, leadId, { lastContact: today }) } catch { /* skip */ }
          }
        }
      }

      // Delivery/read status updates
      for (const status of value?.statuses ?? []) {
        const leadId = await findLeadIdByPhone(status.recipient_id)
        if (leadId) {
          const s = status.status as 'sent' | 'delivered' | 'read' | 'failed'
          await updateMessageStatus(leadId, status.id, s)
        }
      }
    }
  }
}
