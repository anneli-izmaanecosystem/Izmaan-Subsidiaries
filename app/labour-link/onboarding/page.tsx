import { getOnboardingRecords, getLLOnboardingRecords } from '@/lib/ll-db'
import { OnboardingClient } from './_components/onboarding-client'

export default async function OnboardingPage() {
  const [slRecords, llRecords] = await Promise.all([
    getOnboardingRecords(),
    getLLOnboardingRecords(),
  ])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[rgba(0,0,0,0.08)] bg-white px-6 py-4">
        <h1 className="font-[family-name:var(--font-syne)] text-[22px] font-bold text-gray-900">Onboarding</h1>
        <p className="text-[12px] text-gray-400 font-[family-name:var(--font-dm-mono)]">
          Client onboarding tracker — info request → setup → go live
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <OnboardingClient initialSL={slRecords} initialLL={llRecords} />
      </div>
    </div>
  )
}
