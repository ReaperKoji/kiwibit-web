import { createHmac, randomBytes } from 'crypto'
import type { NextRequest } from 'next/server'
import { isRedisEnabled, redisExpire, redisIncr } from '@/lib/redis'

const CSRF_COOKIE = 'kb_csrf'
const RATE_BUCKET_MS = 60_000
const DAY_BUCKET_MS = 86_400_000

type RateEntry = {
  count: number
  resetAt: number
}

const rateState = new Map<string, RateEntry>()
const dailyState = new Map<string, RateEntry>()

function getSecret() {
  return process.env.SESSION_SECRET ?? 'dev-only-change-me'
}

export function getCsrfCookieName() {
  return CSRF_COOKIE
}

export function createCsrfToken(sessionSeed: string) {
  const nonce = randomBytes(12).toString('hex')
  const payload = `${sessionSeed}:${nonce}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifyCsrfToken(token?: string | null) {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return signature === expected
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 6,
  }
}

export function enforceCsrf(request: Request, cookieValue?: string | null) {
  const headerValue = request.headers.get('x-csrf-token')
  if (!headerValue || !cookieValue) return false
  if (headerValue !== cookieValue) return false
  return verifyCsrfToken(headerValue)
}

export function getClientIp(request: Request | NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function enforceRateLimit(key: string, maxPerMinute: number) {
  const now = Date.now()
  if (isRedisEnabled()) {
    const bucket = Math.floor(now / RATE_BUCKET_MS)
    const bucketKey = `rl:${key}:${bucket}`
    const count = await redisIncr(bucketKey)
    if (count === 1) {
      await redisExpire(bucketKey, 2 * 60)
    }
    if (count > maxPerMinute) {
      return { allowed: false, remaining: 0 }
    }
    return { allowed: true, remaining: Math.max(0, maxPerMinute - count) }
  }

  const current = rateState.get(key)
  if (!current || current.resetAt <= now) {
    rateState.set(key, { count: 1, resetAt: now + RATE_BUCKET_MS })
    return { allowed: true, remaining: maxPerMinute - 1 }
  }

  if (current.count >= maxPerMinute) {
    return { allowed: false, remaining: 0 }
  }

  current.count += 1
  rateState.set(key, current)
  return { allowed: true, remaining: maxPerMinute - current.count }
}

export async function enforceDailyLimit(key: string, maxPerDay: number) {
  const now = Date.now()
  const dayBucket = Math.floor(now / DAY_BUCKET_MS)
  if (isRedisEnabled()) {
    const bucketKey = `dl:${key}:${dayBucket}`
    const count = await redisIncr(bucketKey)
    if (count === 1) {
      await redisExpire(bucketKey, 60 * 60 * 26)
    }
    if (count > maxPerDay) {
      return { allowed: false, remaining: 0 }
    }
    return { allowed: true, remaining: Math.max(0, maxPerDay - count) }
  }

  const cacheKey = `${key}:${dayBucket}`
  const current = dailyState.get(cacheKey)
  if (!current || current.resetAt <= now) {
    dailyState.set(cacheKey, { count: 1, resetAt: now + DAY_BUCKET_MS })
    return { allowed: true, remaining: maxPerDay - 1 }
  }
  if (current.count >= maxPerDay) {
    return { allowed: false, remaining: 0 }
  }
  current.count += 1
  dailyState.set(cacheKey, current)
  return { allowed: true, remaining: maxPerDay - current.count }
}
