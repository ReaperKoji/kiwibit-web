import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendAuditLog } from '@/lib/audit-log'
import { enforceRateLimit, getClientIp } from '@/lib/security'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeText } from '@/lib/sanitize'

const schema = z.object({
  type: z.enum(['page_visit', 'scroll_depth', 'post_dwell', 'post_cta_click', 'tag_click', 'share_click']),
  slug: z.string().optional(),
  tag: z.string().optional(),
  cta: z.string().optional(),
  visitorId: z.string().max(80).optional(),
  depth: z.number().int().nonnegative().optional(),
  ms: z.number().int().nonnegative().optional(),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`blog-analytics:${ip}`, 180)
    if (!rate.allowed) {
      return jsonApiError(ctx, 429, 'Too many requests')
    }
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload')
    }
    const meta = {
      ...parsed.data,
      slug: parsed.data.slug ? sanitizeText(parsed.data.slug, 160) : undefined,
      tag: parsed.data.tag ? sanitizeText(parsed.data.tag, 60) : undefined,
      cta: parsed.data.cta ? sanitizeText(parsed.data.cta, 80) : undefined,
      requestId: ctx.requestId,
    }
    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: parsed.data.visitorId ? sanitizeText(parsed.data.visitorId, 80) : 'visitor',
      actorRole: 'public',
      targetMemberId: 'blog',
      action: parsed.data.type,
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta,
    })
    return withRequestId(ctx, NextResponse.json({ ok: true }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not track event')
  }
}
