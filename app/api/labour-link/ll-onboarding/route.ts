import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getLLOnboardingRecords, upsertLLOnboardingRecord } from '@/lib/ll-db'
import type { LLOnboardingRecord } from '@/lib/ll-types'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getLLOnboardingRecords())
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body: LLOnboardingRecord = await req.json()
  if (!body.id || !body.farmName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await upsertLLOnboardingRecord(body)
  return NextResponse.json(body)
}
