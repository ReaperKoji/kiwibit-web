import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { appendAuditLog } from '@/lib/audit-log'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { setDirectoryMemberActiveState } from '@/lib/member-directory-store'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['activate', 'deactivate']),
  ids: z.array(z.string().min(1)).min(1).max(100),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-bulk', 60, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }

    const shouldActivate = parsed.data.action === 'activate'
    let updated = 0
    for (const id of parsed.data.ids) {
      const ok = await setDirectoryMemberActiveState(id, shouldActivate)
      if (ok) updated += 1
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: checked.session.memberId,
      actorRole: checked.session.role,
      targetMemberId: 'member-directory',
      action: shouldActivate ? 'member_bulk_activated' : 'member_bulk_deactivated',
      ip: checked.ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: { ids: parsed.data.ids, updatedCount: updated, requestId: ctx.requestId },
    })

    revalidateTag('members-directory')
    for (const id of parsed.data.ids) {
      revalidateTag(`member:${id}`)
    }
    return withRequestId(ctx, NextResponse.json({ ok: true, updated }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not execute bulk action')
  }
}
