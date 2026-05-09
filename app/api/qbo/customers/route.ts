import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { listCustomers } from '@/lib/qbo'
import { ratelimit } from '@/lib/ratelimit'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { success } = await ratelimit.limit(userId)
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const customers = await listCustomers()
    return NextResponse.json(customers)
  } catch (err: any) {
    console.error('[qbo/customers]', err)
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 })
  }
}
