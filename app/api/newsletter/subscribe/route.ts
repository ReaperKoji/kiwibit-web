import { NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/audit-log'
import { createPendingSubscriber } from '@/lib/newsletter-store'
import { enforceRateLimit, getClientIp } from '@/lib/security'
import { newsletterSchema } from '@/lib/validation'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeText } from '@/lib/sanitize'
import { sendNewsletterConfirmEmail } from '@/lib/newsletter-delivery'

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`newsletter:${ip}`, 20)
    if (!rate.allowed) {
      return jsonApiError(ctx, 429, 'Too many requests')
    }

    const parsed = newsletterSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid email')
    }

    const safeEmail = sanitizeText(parsed.data.email, 120).toLowerCase()
    const segment = parsed.data.segment ? sanitizeText(parsed.data.segment, 60) : 'general'
    const source = parsed.data.source ? sanitizeText(parsed.data.source, 80) : 'unknown'
    const variant = parsed.data.variant ?? 'A'
    const subscriber = await createPendingSubscriber(safeEmail)
    const confirmUrl = `${new URL(request.url).origin}/newsletter/confirm?token=${subscriber.token}`

    let deliveryResult: { provider: 'none' | 'resend' | 'mailchimp'; delivered: boolean; status: number; details?: string } = {
      provider: 'none',
      delivered: false,
      status: 0,
      details: 'not attempted',
    }

    try {
      deliveryResult = await sendNewsletterConfirmEmail(subscriber.email, confirmUrl)
    } catch (error) {
      logApiError(ctx, error, { scope: 'newsletter-resend' })
    }

    if (!deliveryResult.delivered && process.env.NEWSLETTER_WEBHOOK_URL) {
      try {
        await fetch(process.env.NEWSLETTER_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: subscriber.email,
            confirmUrl,
          }),
        })
      } catch (error) {
        logApiError(ctx, error, { scope: 'newsletter-webhook' })
      }
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: parsed.data.visitorId ? sanitizeText(parsed.data.visitorId, 80) : 'visitor',
      actorRole: 'public',
      targetMemberId: 'newsletter',
      action: 'newsletter_subscribe_pending',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        email: subscriber.email,
        segment,
        source,
        variant,
        requestId: ctx.requestId,
        provider: deliveryResult.provider,
        delivered: deliveryResult.delivered,
        deliveryStatus: deliveryResult.status,
      },
    })

    return withRequestId(
      ctx,
      NextResponse.json({
        ok: true,
        status: subscriber.status,
        confirmUrl,
        delivery: {
          provider: deliveryResult.provider,
          delivered: deliveryResult.delivered,
          status: deliveryResult.status,
        },
      })
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not subscribe')
  }
}
