import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/qbo'

export async function GET() {
  const url = getAuthUrl('debug-state')
  return NextResponse.json({ oauthUrl: url })
}
