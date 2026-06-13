import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { isSeeded, seedAll } from '@/lib/ll-db'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (await isSeeded()) {
    return NextResponse.json({ message: 'Already seeded' })
  }

  await seedAll()
  return NextResponse.json({ message: 'Seeded successfully' })
}
