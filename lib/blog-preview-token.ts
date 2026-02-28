import { createHmac } from 'crypto'

type BlogPreviewPayload = {
  slug: string
  exp: number
}

function getSecret() {
  return process.env.SESSION_SECRET ?? 'dev-only-change-me'
}

function toB64(value: string) {
  return Buffer.from(value).toString('base64url')
}

function fromB64(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payloadB64: string) {
  return createHmac('sha256', getSecret()).update(payloadB64).digest('base64url')
}

export function createBlogPreviewToken(slug: string, ttlSeconds = 60 * 30) {
  const payload: BlogPreviewPayload = {
    slug,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadB64 = toB64(JSON.stringify(payload))
  return `${payloadB64}.${sign(payloadB64)}`
}

export function verifyBlogPreviewToken(token?: string | null) {
  if (!token) return null
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return null
  if (sign(payloadB64) !== signature) return null
  try {
    const parsed = JSON.parse(fromB64(payloadB64)) as BlogPreviewPayload
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}
