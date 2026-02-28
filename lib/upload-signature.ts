import { createHmac, timingSafeEqual } from 'crypto'

export type UploadScope = 'member-avatar' | 'admin-avatar' | 'admin-media'

type UploadTokenPayload = {
  memberId: string
  scope: UploadScope
  exp: number
}

function getSecret() {
  return process.env.UPLOAD_SIGNATURE_SECRET || process.env.SESSION_SECRET || 'dev-only-change-me'
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

export function createUploadToken(memberId: string, scope: UploadScope, ttlSeconds = 300) {
  const payload: UploadTokenPayload = {
    memberId,
    scope,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const signature = sign(payloadB64)
  return `${payloadB64}.${signature}`
}

export function verifyUploadToken(
  token: string | null | undefined,
  scope: UploadScope,
  expectedMemberId?: string
): { ok: boolean; reason?: string } {
  if (!token) return { ok: false, reason: 'missing_token' }
  const [payloadB64, signature] = token.split('.')
  if (!payloadB64 || !signature) return { ok: false, reason: 'invalid_format' }

  const expected = sign(payloadB64)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return { ok: false, reason: 'invalid_signature' }
  if (!timingSafeEqual(a, b)) return { ok: false, reason: 'invalid_signature' }

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as UploadTokenPayload
    if (payload.scope !== scope) return { ok: false, reason: 'invalid_scope' }
    if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' }
    if (expectedMemberId && payload.memberId !== expectedMemberId) {
      return { ok: false, reason: 'member_mismatch' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'invalid_payload' }
  }
}
