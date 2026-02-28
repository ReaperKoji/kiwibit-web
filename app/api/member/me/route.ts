import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { appendAuditLog } from '@/lib/audit-log'
import { getDirectoryMemberById } from '@/lib/member-directory-store'
import { approvePendingMemberById, getManagedMemberById, publishDraftMemberById, revertDraftMemberByVersion, saveDraftMemberById } from '@/lib/member-store'
import { createPreviewToken } from '@/lib/preview-token'
import { enforceCsrf, enforceRateLimit, getClientIp, getCsrfCookieName } from '@/lib/security'
import { getSessionFromCookiesAsync, type SessionRole } from '@/lib/session'
import { memberDraftSchema } from '@/lib/validation'
import { z } from 'zod'

const actionSchema = z.object({
  action: z.enum(['publish', 'revert', 'approve', 'preview']),
  versionId: z.string().optional(),
  memberId: z.string().optional(),
})

const MEMBER_ONLY_FIELDS = ['clearance', 'contactEmail'] as const

function stripRestrictedFieldsForMember(payload: Record<string, unknown>, role: SessionRole) {
  if (role === 'admin') return payload
  const clone = { ...payload }
  for (const key of MEMBER_ONLY_FIELDS) {
    delete clone[key]
  }
  return clone
}

function actorRole(role: SessionRole): 'member' | 'admin' {
  return role === 'admin' ? 'admin' : 'member'
}

async function safeReadJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const managed = await getManagedMemberById(session.memberId)
  if (!managed) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json({ ...managed, role: session.role })
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`member-save:${ip}:${session?.memberId ?? 'anon'}`, 60)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!enforceCsrf(request, cookieStore.get(getCsrfCookieName())?.value)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const raw = await safeReadJson(request)
  if (!raw) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }
  const filtered = stripRestrictedFieldsForMember(raw, session.role)
  const parsed = memberDraftSchema.safeParse(filtered)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const managed = await saveDraftMemberById(session.memberId, parsed.data)
  if (!managed) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  await appendAuditLog({
    at: new Date().toISOString(),
    actorMemberId: session.memberId,
    actorRole: session.role,
    targetMemberId: session.memberId,
    action: 'draft_saved',
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  })

  return NextResponse.json({ ok: true, ...managed, role: session.role })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`member-action:${ip}:${session?.memberId ?? 'anon'}`, 80)

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!enforceCsrf(request, cookieStore.get(getCsrfCookieName())?.value)) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }

  const body = await safeReadJson(request)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action payload' }, { status: 400 })
  }
  const payload = parsed.data

  if (payload.action === 'preview') {
    const token = createPreviewToken(session.memberId)
    return NextResponse.json({ ok: true, token, previewUrl: `/preview/member/${session.memberId}?token=${token}` })
  }

  if (payload.action === 'publish') {
    const managed = await publishDraftMemberById(session.memberId, actorRole(session.role))
    if (!managed) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: session.memberId,
      actorRole: session.role,
      targetMemberId: session.memberId,
      action: session.role === 'admin' ? 'published_direct' : 'submitted_review',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    })
    return NextResponse.json({ ok: true, ...managed, role: session.role })
  }

  if (payload.action === 'revert') {
    if (!payload.versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 })
    }
    const managed = await revertDraftMemberByVersion(session.memberId, payload.versionId)
    if (!managed) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }
    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: session.memberId,
      actorRole: session.role,
      targetMemberId: session.memberId,
      action: 'reverted_version',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: { versionId: payload.versionId },
    })
    return NextResponse.json({ ok: true, ...managed, role: session.role })
  }

  if (payload.action === 'approve') {
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const target = payload.memberId
    if (!target || !(await getDirectoryMemberById(target))) {
      return NextResponse.json({ error: 'Invalid memberId' }, { status: 400 })
    }
    const managed = await approvePendingMemberById(target)
    if (!managed) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: session.memberId,
      actorRole: session.role,
      targetMemberId: target,
      action: 'approved_pending',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    })
    return NextResponse.json({ ok: true, targetMemberId: target, managed })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
