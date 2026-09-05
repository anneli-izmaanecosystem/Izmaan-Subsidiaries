import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, companySettings } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [settings] = await db.select().from(companySettings)
  return NextResponse.json(settings ?? null)
}
