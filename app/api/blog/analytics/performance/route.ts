import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendAuditLog } from '@/lib/audit-log'
import { enforceRateLimit, getClientIp } from '@/lib/security'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeText } from '@/lib/sanitize'
import { emitOpsAlert } from '@/lib/ops-alerts'
import { getWebVitalBudget, isWebVitalBudgetExceeded, shouldEmitWebVitalAlert } from '@/lib/web-vitals-budget'

const schema = z.object({
  slug: z.string().min(1).max(180),
  metric: z.enum(['LCP', 'CLS', 'INP', 'FCP', 'TTFB']),
  value: z.number().nonnegative(),
  page: z.string().min(1).max(240).optional(),
  visitorId: z.string().max(80).optional(),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`blog-performance:${ip}`, 120)
    if (!rate.allowed) {
      return jsonApiError(ctx, 429, 'Too many requests')
    }
    const raw = await request.text()
    if (!raw || raw.trim().length === 0) {
      return jsonApiError(ctx, 400, 'Invalid payload')
    }
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      return jsonApiError(ctx, 400, 'Invalid payload')
    }
    const parsed = schema.safeParse(parsedJson)
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload')
    }

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: parsed.data.visitorId ? sanitizeText(parsed.data.visitorId, 80) : 'visitor',
      actorRole: 'public',
      targetMemberId: 'blog',
      action: 'performance_metric',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: {
        slug: sanitizeText(parsed.data.slug, 180),
        metric: parsed.data.metric,
        value: parsed.data.value,
        page: parsed.data.page ? sanitizeText(parsed.data.page, 240) : undefined,
        requestId: ctx.requestId,
      },
    })

    if (isWebVitalBudgetExceeded(parsed.data.metric, parsed.data.value)) {
      const alertKey = `${parsed.data.metric}:${parsed.data.slug}:${parsed.data.page ?? 'page'}`
      if (shouldEmitWebVitalAlert(alertKey)) {
        await emitOpsAlert({
          event: 'web_vitals_regression',
          severity: 'warning',
          message: `${parsed.data.metric} acima do budget em ${parsed.data.slug}`,
          context: {
            metric: parsed.data.metric,
            value: parsed.data.value,
            budget: getWebVitalBudget(parsed.data.metric),
            slug: parsed.data.slug,
            page: parsed.data.page ?? null,
            requestId: ctx.requestId,
          },
        })
      }
    }

    return withRequestId(ctx, NextResponse.json({ ok: true }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not track performance metric')
  }
}
