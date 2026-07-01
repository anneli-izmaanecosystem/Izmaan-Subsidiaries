import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getOnboardingRecords, upsertOnboardingRecord } from '@/lib/ll-db'
import type { SLOnboardingRecord } from '@/lib/ll-types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const records = await getOnboardingRecords()
  return NextResponse.json(records)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: SLOnboardingRecord = await req.json()
  if (!body.id || !body.orgName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await upsertOnboardingRecord(body)
  return NextResponse.json(body)
}
