import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { isRedisEnabled, redisDel, redisGet, redisSetEx } from '@/lib/redis'

export const SESSION_COOKIE = 'kb_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12

export type SessionRole = 'member' | 'member_manager' | 'editor' | 'admin'

type SessionPayload = {
  memberId: string
  email: string
  role: SessionRole
  exp: number
}

function getSecret() {
  return process.env.SESSION_SECRET ?? 'dev-only-change-me'
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payloadB64: string) {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
}

function tokenKey(token: string) {
  const hash = createHash('sha256').update(token).digest('hex')
  return `sess:${hash}`
}

export function createSessionToken(memberId: string, email: string, role: SessionRole) {
  const payload: SessionPayload = {
    memberId,
    email,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null

  const expected = sign(payloadB64)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function createSessionTokenPersisted(memberId: string, email: string, role: SessionRole) {
  const token = createSessionToken(memberId, email, role)
  if (isRedisEnabled()) {
    await redisSetEx(tokenKey(token), SESSION_TTL_SECONDS, '1')
  }
  return token
}

export async function verifySessionTokenAsync(token?: string | null): Promise<SessionPayload | null> {
  const session = verifySessionToken(token)
  if (!session) return null
  if (!isRedisEnabled()) return session
  const active = await redisGet(tokenKey(token as string))
  if (!active) return null
  return session
}

export async function revokeSessionToken(token?: string | null) {
  if (!token || !isRedisEnabled()) return
  await redisDel(tokenKey(token))
}

type CookieLikeStore = {
  get(name: string): { value: string } | undefined
}

export function getSessionFromCookies(cookieStore: CookieLikeStore) {
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

export async function getSessionFromCookiesAsync(cookieStore: CookieLikeStore) {
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return verifySessionTokenAsync(token)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

export function shouldRotateSession(session: SessionPayload) {
  const now = Math.floor(Date.now() / 1000)
  const remaining = session.exp - now
  return remaining < SESSION_TTL_SECONDS / 2
}
