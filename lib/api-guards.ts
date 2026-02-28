import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { enforceCsrf, enforceRateLimit, getClientIp, getCsrfCookieName } from '@/lib/security'
import { getSessionFromCookiesAsync } from '@/lib/session'
import type { SessionRole } from '@/lib/session'

type GuardContext = {
  session: NonNullable<Awaited<ReturnType<typeof getSessionFromCookiesAsync>>>
  ip: string
}

type GuardFailure = {
  response: NextResponse
}

export async function requireSession(request: Request, rateKey: string, maxPerMinute: number): Promise<GuardContext | GuardFailure> {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`${rateKey}:${ip}:${session?.memberId ?? 'anon'}`, maxPerMinute)
  if (!rate.allowed) {
    return { response: NextResponse.json({ error: 'Too many requests' }, { status: 429 }) }
  }
  if (!session) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session, ip }
}

export async function requireAdmin(request: Request, rateKey: string, maxPerMinute: number): Promise<GuardContext | GuardFailure> {
  const checked = await requireSession(request, rateKey, maxPerMinute)
  if ('response' in checked) return checked
  if (checked.session.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return checked
}

export async function requireAnyRole(
  request: Request,
  rateKey: string,
  maxPerMinute: number,
  roles: SessionRole[]
): Promise<GuardContext | GuardFailure> {
  const checked = await requireSession(request, rateKey, maxPerMinute)
  if ('response' in checked) return checked
  if (!roles.includes(checked.session.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return checked
}

export async function requireCsrfHeader(request: Request): Promise<true | GuardFailure> {
  const cookieStore = await cookies()
  const csrfCookie = cookieStore.get(getCsrfCookieName())?.value
  if (!enforceCsrf(request, csrfCookie)) {
    return { response: NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 }) }
  }
  return true
}
