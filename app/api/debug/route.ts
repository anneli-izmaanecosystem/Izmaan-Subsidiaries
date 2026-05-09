import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    clientId: process.env.QBO_CLIENT_ID ? `${process.env.QBO_CLIENT_ID.slice(0, 6)}...` : 'MISSING',
    redirectUri: process.env.QBO_REDIRECT_URI ?? 'MISSING',
    clientSecret: process.env.QBO_CLIENT_SECRET ? 'SET' : 'MISSING',
  })
}
