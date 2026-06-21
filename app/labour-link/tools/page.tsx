import { getTemplates } from '@/lib/ll-db'
import { ToolsClient } from './tools-client'

export default async function ToolsPage() {
  const waConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  const phoneIdSet   = !!process.env.WHATSAPP_PHONE_NUMBER_ID
  const wabaIdSet    = !!process.env.WHATSAPP_WABA_ID
  const tokenSet     = !!process.env.WHATSAPP_ACCESS_TOKEN
  const webhookSet   = !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  const templates = await getTemplates()

  return (
    <div className="p-6 font-[family-name:var(--font-dm-mono)]">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-gray-900">Tools</h1>
        <p className="text-[12px] text-gray-400">WhatsApp templates and API connection status</p>
      </div>

      {/* WhatsApp API Status */}
      <div className={`mb-6 rounded-xl border p-5 ${waConfigured ? 'border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.04)]' : 'border-[rgba(212,134,10,0.3)] bg-[rgba(212,134,10,0.04)]'}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${waConfigured ? 'bg-[#18a86b]' : 'bg-[#d4860a]'} text-white`}>
            {waConfigured ? '✓' : '!'}
          </div>
          <div className="flex-1">
            <p className={`font-[family-name:var(--font-syne)] text-[15px] font-bold ${waConfigured ? 'text-[#18a86b]' : 'text-[#d4860a]'}`}>
              WhatsApp Cloud API — {waConfigured ? 'Connected' : 'Not configured'}
            </p>
            {waConfigured ? (
              <p className="mt-1 text-[12px] text-gray-500">
                Sending messages directly from lead cards. Incoming messages and delivery receipts are processed automatically via the webhook.
              </p>
            ) : (
              <div className="mt-2 space-y-3 text-[12px]">
                <p className="text-gray-600">Add these environment variables to enable API messaging from lead cards:</p>
                <div className="space-y-1.5">
                  {[
                    { key: 'WHATSAPP_ACCESS_TOKEN',         set: tokenSet,   label: 'Meta access token (System User or temp)' },
                    { key: 'WHATSAPP_PHONE_NUMBER_ID',      set: phoneIdSet, label: 'Phone Number ID from Meta Business dashboard' },
                    { key: 'WHATSAPP_WABA_ID',             set: wabaIdSet,  label: 'WhatsApp Business Account ID' },
                    { key: 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', set: webhookSet, label: 'Any secret string you choose for webhook verification' },
                  ].map(({ key, set, label }) => (
                    <div key={key} className="flex items-start gap-2">
                      <span className={`mt-0.5 text-[10px] font-bold ${set ? 'text-[#18a86b]' : 'text-[#d93f3f]'}`}>
                        {set ? '✓' : '✗'}
                      </span>
                      <div>
                        <code className="font-[family-name:var(--font-dm-mono)] text-[11px] text-gray-800">{key}</code>
                        <span className="ml-2 text-gray-400">{label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-[rgba(0,0,0,0.08)] bg-white p-3 text-[11px] text-gray-600">
                  <p className="mb-2 font-semibold text-gray-800">Setup steps</p>
                  <ol className="list-decimal space-y-1 pl-4">
                    <li>Go to <strong>developers.facebook.com</strong> → your app → WhatsApp → API Setup</li>
                    <li>Copy the <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong></li>
                    <li>Generate a <strong>System User access token</strong> in Meta Business Suite with <code>whatsapp_business_messaging</code> permission</li>
                    <li>Add all four env vars to your Vercel project (Settings → Environment Variables)</li>
                    <li>Set webhook URL to <code>https://your-domain.vercel.app/api/labour-link/whatsapp/webhook</code> with your verify token</li>
                    <li>Subscribe to <strong>messages</strong> and <strong>message_status_updates</strong> webhook fields</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template grid — client component owns add/edit/delete */}
      <ToolsClient initialTemplates={templates} />
    </div>
  )
}
