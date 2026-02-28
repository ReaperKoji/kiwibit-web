import { NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/audit-log'
import { confirmSubscriberByToken } from '@/lib/newsletter-store'
import { upsertMailchimpSubscriber } from '@/lib/newsletter-delivery'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getClientIp } from '@/lib/security'
import { sanitizeText } from '@/lib/sanitize'

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const payload = (await request.json()) as { token?: string; visitorId?: string }
    if (!payload.token) {
      return jsonApiError(ctx, 400, 'Token is required')
    }
    const confirmed = await confirmSubscriberByToken(payload.token)
    if (!confirmed) {
      return jsonApiError(ctx, 404, 'Invalid token')
    }

    let mailchimp: { provider: 'none' | 'resend' | 'mailchimp'; delivered: boolean; status: number } = {
      provider: 'none',
      delivered: false,
      status: 0,
    }
    try {
      const result = await upsertMailchimpSubscriber(confirmed.email)
      mailchimp = {
        provider: result.provider,
        delivered: result.delivered,
        status: result.status,
      }
    } catch (error) {
      logApiError(ctx, error, { scope: 'newsletter-mailchimp' })
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: payload.visitorId ? sanitizeText(payload.visitorId, 80) : 'visitor',
      actorRole: 'public',
      targetMemberId: 'newsletter',
      action: 'newsletter_subscribe_confirmed',
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        requestId: ctx.requestId,
        email: confirmed.email,
        provider: mailchimp.provider,
        delivered: mailchimp.delivered,
        providerStatus: mailchimp.status,
      },
    })

    return withRequestId(ctx, NextResponse.json({ ok: true, status: confirmed.status, provider: mailchimp }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not confirm subscription')
  }
}
