import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCustomerStatement } from '@/lib/qbo'
import { ratelimit } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { success } = await ratelimit.limit(userId)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { searchParams } = req.nextUrl
  const customerId = searchParams.get('customerId')
  const startDate  = searchParams.get('startDate')
  const endDate    = searchParams.get('endDate')

  if (!customerId || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
  }

  try {
    const statement = await getCustomerStatement(customerId, startDate, endDate)
    return NextResponse.json(statement)
  } catch (err: any) {
    console.error('[statements]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
