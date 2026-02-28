import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { appendAuditLog } from '@/lib/audit-log'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { createDirectoryMember, listDirectoryMembers } from '@/lib/member-directory-store'
import { sanitizeStringArray, sanitizeText } from '@/lib/sanitize'
import { memberDirectorySchema } from '@/lib/validation'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-list', 120, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const members = await listDirectoryMembers({ includeInactive: true })
    const response = NextResponse.json({ members })
    response.headers.set('cache-control', 'private, no-store')
    return withRequestId(ctx, response)
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load members')
  }
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-create', 80, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = memberDirectorySchema.safeParse(await request.json())
    if (!parsed.success) {
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: checked.session.memberId,
        actorRole: checked.session.role,
        targetMemberId: 'member-directory',
        action: 'member_validation_failed',
        ip: checked.ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { requestId: ctx.requestId, stage: 'create', details: parsed.error.flatten(), durationMs: Date.now() - ctx.startedAt },
      })
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }
    const payload = parsed.data
    const created = await createDirectoryMember({
      name: sanitizeText(payload.name, 120),
      role: sanitizeText(payload.role, 120),
      bio: sanitizeText(payload.bio, 1500),
      avatar_url: sanitizeText(payload.avatar_url, 500),
      specialties: sanitizeStringArray(payload.specialties, 60),
      github_url: payload.github_url ? sanitizeText(payload.github_url, 500) : undefined,
      linkedin_url: payload.linkedin_url ? sanitizeText(payload.linkedin_url, 500) : undefined,
      highlights: payload.highlights ? sanitizeStringArray(payload.highlights, 180) : [],
      account_email: payload.account_email ? sanitizeText(payload.account_email, 320).toLowerCase() : undefined,
      account_password: payload.account_password ? sanitizeText(payload.account_password, 120) : undefined,
      access_role: payload.access_role,
    })

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: checked.session.memberId,
      actorRole: checked.session.role,
      targetMemberId: created.id,
      action: 'member_created',
      ip: checked.ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        requestId: ctx.requestId,
        createdMember: {
          id: created.id,
          name: created.name,
          access_role: created.access_role,
          account_email: created.account_email,
        },
        durationMs: Date.now() - ctx.startedAt,
      },
    })

    revalidateTag('members-directory')
    revalidateTag(`member:${created.id}`)

    return withRequestId(ctx, NextResponse.json({ ok: true, member: created }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not create member')
  }
}
