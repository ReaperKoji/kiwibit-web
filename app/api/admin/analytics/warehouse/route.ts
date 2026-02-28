import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { listAnalyticsDaily, rollupAnalyticsDaily } from '@/lib/analytics-warehouse'

const schema = z.object({
  action: z.enum(['rollup']),
  days: z.number().int().min(1).max(60).optional(),
})

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-warehouse-list', 120, ['admin', 'editor'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const rows = await listAnalyticsDaily(30)
    return withRequestId(ctx, NextResponse.json({ rows }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load warehouse analytics')
  }
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-warehouse-rollup', 60, ['admin'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return jsonApiError(ctx, 400, 'Invalid payload')
    const result = await rollupAnalyticsDaily(parsed.data.days ?? 14)
    return withRequestId(ctx, NextResponse.json({ ok: true, result }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not rollup analytics warehouse')
  }
}
