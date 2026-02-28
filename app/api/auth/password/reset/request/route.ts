import { randomBytes, createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendAuditLog } from '@/lib/audit-log'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getClientIp } from '@/lib/security'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'

const schema = z.object({
  email: z.string().email(),
})

const RESET_TTL_MINUTES = 15

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
    const email = parsed.data.email.toLowerCase()
    const account = await prisma.memberAccount.findUnique({
      where: { email },
      select: { id: true, memberId: true, isActive: true },
    })

    let devToken: string | undefined
    if (account?.isActive) {
      const token = randomBytes(32).toString('hex')
      const tokenHash = createHash('sha256').update(token).digest('hex')
      const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000)
      await prisma.memberAccount.update({
        where: { id: account.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expiresAt,
        },
      })
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: account.memberId,
        actorRole: 'member',
        targetMemberId: account.memberId,
        action: 'password_reset_requested',
        ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { requestId: ctx.requestId, expiresAt: expiresAt.toISOString() },
      })
      if (process.env.NODE_ENV !== 'production') {
        devToken = token
      }
    }

    return withRequestId(
      ctx,
      NextResponse.json({
        ok: true,
        message: 'If the account exists, a reset link has been issued.',
        ...(devToken ? { devToken } : {}),
      })
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not request password reset')
  }
}
