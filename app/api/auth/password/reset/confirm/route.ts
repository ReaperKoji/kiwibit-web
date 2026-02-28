import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendAuditLog } from '@/lib/audit-log'
import { hashPassword } from '@/lib/password'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getClientIp } from '@/lib/security'
import { isStrongPassword, passwordPolicyMessage } from '@/lib/password-policy'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(120).refine(isStrongPassword, passwordPolicyMessage()),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }
    if (!isDatabaseEnabled()) {
      return jsonApiError(ctx, 503, 'Authentication database unavailable')
    }

    const ip = getClientIp(request)
    const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex')
    const now = new Date()

    const account = await prisma.memberAccount.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: { gt: now },
        isActive: true,
      },
      select: { id: true, memberId: true },
    })
    if (!account) {
      return jsonApiError(ctx, 400, 'Reset token is invalid or expired')
    }

    await prisma.memberAccount.update({
      where: { id: account.id },
      data: {
        password: await hashPassword(parsed.data.password),
        passwordResetToken: null,
        passwordResetExpires: null,
        passwordChangedAt: now,
      },
    })

    await appendAuditLog({
      at: now.toISOString(),
      actorMemberId: account.memberId,
      actorRole: 'member',
      targetMemberId: account.memberId,
      action: 'password_reset_confirmed',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: { requestId: ctx.requestId },
    })

    return withRequestId(ctx, NextResponse.json({ ok: true }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not confirm password reset')
  }
}
