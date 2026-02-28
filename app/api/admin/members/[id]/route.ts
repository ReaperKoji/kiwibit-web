import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { appendAuditLog } from '@/lib/audit-log'
import { buildFieldDiff } from '@/lib/audit-diff'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getDirectoryMemberById, softDeleteDirectoryMember, updateDirectoryMember } from '@/lib/member-directory-store'
import { sanitizeStringArray, sanitizeText } from '@/lib/sanitize'
import { memberDirectorySchema } from '@/lib/validation'

type RouteParams = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-update', 80, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)
    const { id } = await params

    const parsed = memberDirectorySchema.safeParse(await request.json())
    if (!parsed.success) {
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: checked.session.memberId,
        actorRole: checked.session.role,
        targetMemberId: id,
        action: 'member_validation_failed',
        ip: checked.ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { requestId: ctx.requestId, stage: 'update', details: parsed.error.flatten(), durationMs: Date.now() - ctx.startedAt },
      })
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }
    const payload = parsed.data
    const before = await getDirectoryMemberById(id)
    const updated = await updateDirectoryMember(id, {
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
    if (!updated) return jsonApiError(ctx, 404, 'Member not found')

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: checked.session.memberId,
      actorRole: checked.session.role,
      targetMemberId: id,
      action: 'member_updated',
      ip: checked.ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        requestId: ctx.requestId,
        diff: buildFieldDiff(before as Record<string, unknown> | null, updated as unknown as Record<string, unknown>),
        durationMs: Date.now() - ctx.startedAt,
      },
    })

    revalidateTag('members-directory')
    revalidateTag(`member:${id}`)

    return withRequestId(ctx, NextResponse.json({ ok: true, member: updated }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not update member')
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-delete', 80, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)
    const { id } = await params

    const before = await getDirectoryMemberById(id)
    const deleted = await softDeleteDirectoryMember(id)
    if (!deleted) {
      return jsonApiError(
        ctx,
        404,
        'Member not found'
      )
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: checked.session.memberId,
      actorRole: checked.session.role,
      targetMemberId: id,
      action: 'member_deleted',
      ip: checked.ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        requestId: ctx.requestId,
        softDelete: true,
        before,
        durationMs: Date.now() - ctx.startedAt,
      },
    })

    revalidateTag('members-directory')
    revalidateTag(`member:${id}`)

    return withRequestId(ctx, NextResponse.json({ ok: true }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not delete member')
  }
}
