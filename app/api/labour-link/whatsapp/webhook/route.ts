import { NextRequest, NextResponse } from 'next/server'
import { appendMessage, updateMessageStatus, findLeadByPhone } from '@/lib/ll-whatsapp'
import { updateLead } from '@/lib/ll-db'
import { redis } from '@/lib/redis'
import type { WAMessage } from '@/lib/ll-whatsapp'

// ─── Webhook verification ─────────────────────────────────────────────────────
// Meta sends GET with hub.mode=subscribe when you save the webhook URL in the
// Meta developer portal. Respond with the challenge to confirm ownership.
export async function GET(req: NextRequest) {
  const mode      = req.nextUrl.searchParams.get('hub.mode')
  const token     = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ─── Inbound events ───────────────────────────────────────────────────────────
// Meta sends POST for every message received or delivery status change.
// Always return 200 — non-200 causes Meta to retry the event repeatedly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })

  try {
    const changes: MetaChange[] = body?.entry?.[0]?.changes ?? []
    for (const change of changes) {
      const value = change?.value
      if (!value) continue
      if (value.messages?.length)  await Promise.all(value.messages.map(handleInbound))
      if (value.statuses?.length)  await Promise.all(value.statuses.map(handleStatus))
    }
  } catch (err) {
    console.error('[WA webhook]', err)
  }

  return NextResponse.json({ ok: true })
}

// ─── Inbound message ──────────────────────────────────────────────────────────
async function handleInbound(msg: MetaMessage) {
  const phone       = msg.from
  const waMessageId = msg.id
  const timestamp   = Number(msg.timestamp) * 1000 // Meta sends Unix seconds

  const text  = extractText(msg)
  const match = await findLeadByPhone(phone)

  if (match) {
    await Promise.all([
      appendMessage({
        id:        crypto.randomUUID(),
        direction: 'inbound',
        text,
        timestamp,
        status:    'delivered',
        waMessageId,
        leadId:    match.leadId,
      } satisfies WAMessage),
      updateLead(match.leadType, match.leadId, {
        lastContact: new Date().toISOString().split('T')[0],
      }),
    ])
  } else {
    // Unknown sender — park in unmatched inbox so Mara can review
    await redis.lpush('ll:inbox:unmatched', JSON.stringify({ phone, text, timestamp, waMessageId }))
    await redis.ltrim('ll:inbox:unmatched', 0, 99)
  }
}

// ─── Delivery / read status ───────────────────────────────────────────────────
async function handleStatus(st: MetaStatus) {
  const STATUS_MAP: Record<string, WAMessage['status']> = {
    sent:      'sent',
    delivered: 'delivered',
    read:      'read',
    failed:    'failed',
  }
  const status = STATUS_MAP[st.status]
  if (!status) return

  // recipient_id is the lead's phone — use it to find the lead
  const match = await findLeadByPhone(st.recipient_id)
  if (!match) return

  await updateMessageStatus(match.leadId, st.id, status)
}

// ─── Text extraction ──────────────────────────────────────────────────────────
function extractText(msg: MetaMessage): string {
  switch (msg.type) {
    case 'text':     return msg.text?.body ?? ''
    case 'image':    return '[Image received]'
    case 'audio':    return '[Voice note received]'
    case 'video':    return '[Video received]'
    case 'document': return `[Document: ${msg.document?.filename ?? 'file'}]`
    case 'location': return '[Location shared]'
    case 'sticker':  return '[Sticker]'
    default:         return `[${msg.type}]`
  }
}

// ─── Meta payload types ───────────────────────────────────────────────────────
interface MetaChange {
  value?: {
    messages?: MetaMessage[]
    statuses?: MetaStatus[]
  }
}

interface MetaMessage {
  from:      string
  id:        string
  timestamp: string
  type:      string
  text?:     { body: string }
  image?:    { id: string }
  audio?:    { id: string }
  video?:    { id: string }
  document?: { id: string; filename?: string }
  location?: { latitude: number; longitude: number }
}

interface MetaStatus {
  id:           string  // wamid — matches WAMessage.waMessageId
  recipient_id: string  // lead's phone in E.164
  status:       string  // sent | delivered | read | failed
  timestamp:    string
}
