import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, saveTokens, verifyOAuthState } from '@/lib/qbo'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code    = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const state   = searchParams.get('state')

  if (!code || !realmId || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_request', req.url))
  }

  const validState = await verifyOAuthState(state)
  if (!validState) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', req.url))
  }

  try {
    const tokens = await exchangeCode(code, realmId)
    await saveTokens(tokens)
    return NextResponse.redirect(new URL('/dashboard/settings?connected=true', req.url))
  } catch {
    return NextResponse.redirect(new URL('/dashboard/settings?error=connection_failed', req.url))
  }
}
