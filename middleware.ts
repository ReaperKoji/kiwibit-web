import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'kb_session'
const IS_PROD = process.env.NODE_ENV === 'production'
const RATE_WINDOW_MS = 60_000

type RateRecord = { count: number; resetAt: number }

const apiRateState: Map<string, RateRecord> =
  (globalThis as unknown as { __kbApiRateState?: Map<string, RateRecord> }).__kbApiRateState ??
  new Map<string, RateRecord>()

;(globalThis as unknown as { __kbApiRateState?: Map<string, RateRecord> }).__kbApiRateState = apiRateState

const SENSITIVE_API_PREFIXES = [
  '/api/auth',
  '/api/admin',
  '/api/member/upload',
  '/api/admin/members/avatar',
  '/api/admin/posts/media',
]

function isSensitivePath(pathname: string) {
  if (pathname.startsWith('/admin')) return true
  return SENSITIVE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function getApiLimit(pathname: string) {
  if (pathname.startsWith('/api/auth')) return 90
  if (pathname.startsWith('/api/blog/analytics')) return 180
  if (pathname.startsWith('/api/admin')) return 120
  return 240
}

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

function enforceApiRateLimit(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api/')) {
    return { allowed: true, remaining: 0, limit: 0 }
  }
  const ip = getClientIp(request)
  const limit = getApiLimit(pathname)
  const key = `${pathname}:${ip}`
  const now = Date.now()
  const current = apiRateState.get(key)
  if (!current || current.resetAt <= now) {
    apiRateState.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return { allowed: true, remaining: limit - 1, limit }
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, limit }
  }
  current.count += 1
  apiRateState.set(key, current)
  return { allowed: true, remaining: limit - current.count, limit }
}

function getContentSecurityPolicy(pathname: string) {
  if (!isSensitivePath(pathname)) return ''
  const scriptSrc = IS_PROD ? "'self'" : "'self' 'unsafe-eval'"
  return [
    "default-src 'self'",
    `script-src ${scriptSrc} 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

function applySecurityHeaders(response: NextResponse, pathname: string, requestId: string) {
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('x-frame-options', 'DENY')
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  response.headers.set('x-dns-prefetch-control', 'off')
  response.headers.set('cross-origin-opener-policy', 'same-origin')
  response.headers.set('cross-origin-resource-policy', 'same-site')
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()')
  if (IS_PROD) {
    response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload')
  }
  const csp = getContentSecurityPolicy(pathname)
  if (csp) {
    response.headers.set('content-security-policy', csp)
  }
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get('x-request-id')?.trim() || crypto.randomUUID()
  const headers = new Headers(request.headers)
  headers.set('x-request-id', requestId)
  const apiRate = enforceApiRateLimit(request)
  if (!apiRate.allowed) {
    const limited = NextResponse.json({ error: 'Too many requests', requestId }, { status: 429 })
    limited.headers.set('x-ratelimit-limit', String(apiRate.limit))
    limited.headers.set('x-ratelimit-remaining', '0')
    applySecurityHeaders(limited, request.nextUrl.pathname, requestId)
    return limited
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      const redirected = NextResponse.redirect(loginUrl)
      applySecurityHeaders(redirected, request.nextUrl.pathname, requestId)
      return redirected
    }
  }
  const response = NextResponse.next({
    request: {
      headers,
    },
  })
  applySecurityHeaders(response, request.nextUrl.pathname, requestId)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('x-ratelimit-limit', String(apiRate.limit))
    response.headers.set('x-ratelimit-remaining', String(Math.max(0, apiRate.remaining)))
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
