import { NextResponse } from 'next/server'
import { getAuthUrl, saveOAuthState } from '@/lib/qbo'

export async function GET() {
  const state = crypto.randomUUID()
  await saveOAuthState(state)
  return NextResponse.redirect(getAuthUrl(state))
}
