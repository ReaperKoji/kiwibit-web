import { NextResponse } from 'next/server'
import { revokeSessionToken, SESSION_COOKIE } from '@/lib/session'
import { enforceRateLimit, getClientIp, getCsrfCookieName } from '@/lib/security'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`logout:${ip}`, 30)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const requestCookieHeader = request.headers.get('cookie') ?? ''
  const token = requestCookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE}=`))
    ?.split('=')
    .slice(1)
    .join('=')
  await revokeSessionToken(token ?? null)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  response.cookies.set(getCsrfCookieName(), '', {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
