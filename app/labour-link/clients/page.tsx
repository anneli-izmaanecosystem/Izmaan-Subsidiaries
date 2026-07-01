import { getLeads } from '@/lib/ll-db'
import type { Lead } from '@/lib/ll-types'
import { ClientCard } from './client-card'

export default async function ClientsPage() {
  const leadsLL = await getLeads('ll')
  const clients = leadsLL.filter((l): l is Lead => l.stage === 'Active Client')
  const mrr = clients.reduce((sum, c) => sum + (c.revenue ?? 0), 0)

  return (
    <div className="p-6 font-[family-name:var(--font-dm-mono)]">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-gray-900">Clients</h1>
          <p className="text-[12px] text-gray-400">{clients.length} active clients · R{mrr.toLocaleString('en-ZA')} MRR</p>
        </div>
        <div className="rounded-xl border border-[rgba(24,168,107,0.3)] bg-[rgba(24,168,107,0.06)] px-4 py-2 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[#18a86b]">Monthly Revenue</p>
          <p className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-[#18a86b]">
            R{mrr.toLocaleString('en-ZA')}
          </p>
        </div>
      </div>

      {clients.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-[13px] text-gray-400">No active clients yet. Move leads to <strong>Active Client</strong> in the Pipeline.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {clients.map(c => (
          <ClientCard key={c.id} client={c} />
        ))}
      </div>
    </div>
  )
}
