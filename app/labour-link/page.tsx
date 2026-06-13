import { getLeads, getKPIs, getActionChecked, isSeeded, seedAll } from '@/lib/ll-db'
import type { ActionItem, Lead } from '@/lib/ll-types'
import { ActionList } from './_components/action-list'
import { KPITable } from './_components/kpi-table'
import { AddLeadModal } from './_components/add-lead-modal'
import { BulkImport } from './_components/bulk-import'

function daysSince(dateStr: string): number {
  if (!dateStr) return 9999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

function generateActions(leadsLL: Lead[], leadsSL: Lead[], kiepersol: Lead[]): ActionItem[] {
  const actions: ActionItem[] = []

  // LL: Meeting Done — high priority follow-ups
  leadsLL.filter(l => l.stage === 'Meeting Done' && l.priority === 'high').forEach(l => {
    const days = daysSince(l.lastContact)
    actions.push({
      id: `act-ll-${l.id}`,
      title: `Follow up: ${l.name}`,
      meta: `Meeting done. Blocker: ${l.blocker || 'unknown'}`,
      contact: l.phone || undefined,
      type: days > 14 ? 'overdue' : 'followup',
      priority: 'high',
      accentColor: days > 14 ? '#d93f3f' : '#d4860a',
      tag: 'LL Pipeline',
      leadId: l.id,
      pipeline: 'll',
    })
  })

  // LL: Onboarding
  leadsLL.filter(l => l.stage === 'Onboarding').forEach(l => {
    actions.push({
      id: `act-onb-${l.id}`,
      title: `Chase onboarding info: ${l.name}`,
      meta: `Waiting for: ${l.blocker || 'documentation'}`,
      contact: l.phone || undefined,
      type: 'onboarding',
      priority: 'high',
      accentColor: '#d4860a',
      tag: 'Onboarding',
      leadId: l.id,
      pipeline: 'll',
    })
  })

  // SL: Meeting Done
  leadsSL.filter(l => l.stage === 'Meeting Done').forEach(l => {
    actions.push({
      id: `act-sl-${l.id}`,
      title: `Follow up (Safe Link): ${l.name}`,
      meta: l.blocker || 'Post-meeting follow up',
      contact: l.phone || undefined,
      type: 'sl',
      priority: 'high',
      accentColor: '#3a6bef',
      tag: 'SL Pipeline',
      leadId: l.id,
      pipeline: 'sl',
    })
  })

  // Kiepersol bundle
  const contacted = kiepersol.filter(k => k.contacted).length
  if (contacted < 15) {
    actions.push({
      id: 'act-kiep',
      title: 'Kiepersol Bundle: contact next batch of farms',
      meta: `${contacted}/26 contacted. Target 15 for group pricing. Huge revenue opportunity.`,
      type: 'kiepersol',
      priority: 'high',
      accentColor: '#18a86b',
      tag: 'Kiepersol',
    })
  }

  // LL: Contacted with no response > 7 days
  leadsLL
    .filter(l => l.stage === 'Contacted' && daysSince(l.lastContact) > 7 && l.priority !== 'low')
    .forEach(l => {
      actions.push({
        id: `act-fu-${l.id}`,
        title: `7-day follow-up: ${l.name}`,
        meta: `Last contact: ${l.lastContact || 'unknown'}. Send follow-up WA.`,
        contact: l.phone || undefined,
        type: 'followup',
        priority: 'medium',
        accentColor: '#7a8199',
        tag: 'Follow-up',
        leadId: l.id,
        pipeline: 'll',
      })
    })

  // SL: New leads (top 3)
  leadsSL.filter(l => l.stage === 'New Lead').slice(0, 3).forEach(l => {
    actions.push({
      id: `act-new-sl-${l.id}`,
      title: `New SL lead to contact: ${l.name}`,
      meta: `${l.area} — ${l.phone || 'find number first'}`,
      contact: l.phone || undefined,
      type: 'new',
      priority: 'medium',
      accentColor: '#3a6bef',
      tag: 'SL — New',
      leadId: l.id,
      pipeline: 'sl',
    })
  })

  return actions
}

export default async function LLDashboard() {
  // Auto-seed on first visit
  if (!(await isSeeded())) await seedAll()

  const waConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
  const month = new Date().toISOString().slice(0, 7)

  const [leadsLL, leadsSL, kiepersol, kpis, checked] = await Promise.all([
    getLeads('ll'),
    getLeads('sl'),
    getLeads('kiepersol'),
    getKPIs(month),
    getActionChecked(),
  ])

  const actions = generateActions(leadsLL, leadsSL, kiepersol)

  const activeClients = leadsLL.filter(l => l.stage === 'Active Client')
  const mrr = activeClients.reduce((sum, l) => sum + (l.revenue ?? 0), 0)
  const mrrTarget = 5000
  const mrrPct = Math.min(100, Math.round((mrr / mrrTarget) * 100))

  const activePipeline = leadsLL.filter(l => l.stage !== 'Active Client').length
  const slPipeline = leadsSL.filter(l => l.stage !== 'Active Client').length

  return (
    <div className="p-6 font-[family-name:var(--font-dm-mono)]">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-[12px] text-gray-400">{new Date().toLocaleDateString('en-ZA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImport />
          <AddLeadModal />
        </div>
      </div>

      {/* MRR + pipeline metrics */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        {/* MRR */}
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">MRR</p>
          <p className="mt-1 font-[family-name:var(--font-syne)] text-[26px] font-bold text-[#18a86b]">
            R{mrr.toLocaleString('en-ZA')}
          </p>
          <p className="text-[11px] text-gray-400">of R5,000 target</p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#18a86b] transition-all" style={{ width: `${mrrPct}%` }} />
          </div>
        </div>

        {/* Active clients */}
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Active Clients</p>
          <p className="mt-1 font-[family-name:var(--font-syne)] text-[26px] font-bold text-gray-900">
            {activeClients.length}
          </p>
          <p className="text-[11px] text-gray-400">Labour Link</p>
        </div>

        {/* LL pipeline */}
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">LL Pipeline</p>
          <p className="mt-1 font-[family-name:var(--font-syne)] text-[26px] font-bold text-[#3a6bef]">
            {activePipeline}
          </p>
          <p className="text-[11px] text-gray-400">active leads</p>
        </div>

        {/* SL pipeline */}
        <div className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400">SL Pipeline</p>
          <p className="mt-1 font-[family-name:var(--font-syne)] text-[26px] font-bold text-[#7c50d8]">
            {slPipeline}
          </p>
          <p className="text-[11px] text-gray-400">active leads</p>
        </div>
      </div>

      {/* Two-column: actions + KPIs */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <ActionList actions={actions} initialChecked={checked} leads={[...leadsLL, ...leadsSL]} waConfigured={waConfigured} />
        <KPITable kpis={kpis} month={month} />
      </div>
    </div>
  )
}
