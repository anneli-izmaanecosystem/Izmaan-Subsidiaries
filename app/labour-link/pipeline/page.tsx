import { getLeads } from '@/lib/ll-db'
import { PipelineBoard } from './pipeline-board'
import { BulkImport } from '../_components/bulk-import'

export default async function PipelinePage() {
  const waConfigured = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)

  const [leadsLL, leadsSL, kiepersol] = await Promise.all([
    getLeads('ll'),
    getLeads('sl'),
    getLeads('kiepersol'),
  ])

  return (
    <div className="p-6 font-[family-name:var(--font-dm-mono)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-gray-900">Pipeline</h1>
          <p className="text-[12px] text-gray-400">
            Labour Link · Safe Link · Kiepersol Bundle
          </p>
        </div>
        <BulkImport />
      </div>

      <PipelineBoard leadsLL={leadsLL} leadsSL={leadsSL} kiepersol={kiepersol} waConfigured={waConfigured} />
    </div>
  )
}
