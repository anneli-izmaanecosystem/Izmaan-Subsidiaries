import { redis } from './redis'
import type { LeadType } from './ll-types'

export interface WAMessage {
  id: string
  direction: 'inbound' | 'outbound'
  text: string
  timestamp: number
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
  waMessageId?: string
  leadId: string
}

const META_VERSION = 'v20.0'

function phoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('27')) return d
  if (d.startsWith('0')) return '27' + d.slice(1)
  return d
}

// ─── Client ───────────────────────────────────────────────────────────────────
export class WhatsAppClient {
  private token: string
  private phoneId: string
  readonly configured: boolean

  constructor() {
    this.token   = process.env.WHATSAPP_ACCESS_TOKEN ?? ''
    this.phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''
    this.configured = !!(this.token && this.phoneId)
  }

  private async post(path: string, body: unknown) {
    const res = await fetch(`https://graph.facebook.com/${META_VERSION}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async sendText(to: string, text: string) {
    return this.post(`/${this.phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneDigits(to),
      type: 'text',
      text: { body: text, preview_url: false },
    })
  }

  async sendTemplate(to: string, templateName: string, languageCode: string, components?: unknown[]) {
    return this.post(`/${this.phoneId}/messages`, {
      messaging_product: 'whatsapp',
      to: phoneDigits(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    })
  }

  async getTemplates(): Promise<{ name: string; status: string; language: string }[]> {
    if (!this.configured) return []
    const wabaId = process.env.WHATSAPP_WABA_ID ?? ''
    if (!wabaId) return []
    const res = await fetch(
      `https://graph.facebook.com/${META_VERSION}/${wabaId}/message_templates?fields=name,status,language`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    )
    const json = await res.json()
    return json.data ?? []
  }
}

export const wa = new WhatsAppClient()

// ─── Message log (Redis) ──────────────────────────────────────────────────────
const msgKey = (leadId: string) => `ll:messages:${leadId}`

export async function getMessages(leadId: string): Promise<WAMessage[]> {
  return (await redis.get<WAMessage[]>(msgKey(leadId))) ?? []
}

export async function appendMessage(msg: WAMessage): Promise<void> {
  const msgs = await getMessages(msg.leadId)
  msgs.push(msg)
  await redis.set(msgKey(msg.leadId), msgs)
}

export async function updateMessageStatus(
  leadId: string,
  waMessageId: string,
  status: WAMessage['status'],
): Promise<void> {
  const msgs = await getMessages(leadId)
  const i = msgs.findIndex(m => m.waMessageId === waMessageId)
  if (i !== -1) { msgs[i].status = status; await redis.set(msgKey(leadId), msgs) }
}

// Find lead ID by phone number (searches all lead types)
export async function findLeadIdByPhone(phone: string): Promise<string | null> {
  const match = await findLeadByPhone(phone)
  return match?.leadId ?? null
}

// Find lead ID + type by phone number — needed for webhook handlers
export async function findLeadByPhone(
  phone: string,
): Promise<{ leadId: string; leadType: LeadType } | null> {
  const { getLeads } = await import('./ll-db')
  const digits = phoneDigits(phone)
  for (const type of ['ll', 'sl', 'kiepersol'] as const) {
    const leads = await getLeads(type)
    const lead = leads.find(l => l.phone && phoneDigits(l.phone) === digits)
    if (lead) return { leadId: lead.id, leadType: type }
  }
  return null
}
