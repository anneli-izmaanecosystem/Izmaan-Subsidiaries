import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getKPIs, updateKPIActual } from '@/lib/ll-db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const kpis = await getKPIs(month)
  return NextResponse.json(kpis)
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { month, id, actual } = await req.json()
  if (!month || !id || actual === undefined) {
    return NextResponse.json({ error: 'Missing month, id or actual' }, { status: 400 })
  }

  await updateKPIActual(month, id, Number(actual))
  return NextResponse.json({ ok: true })
}
