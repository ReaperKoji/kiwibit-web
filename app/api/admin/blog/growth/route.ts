import { NextResponse } from 'next/server'
import { requireAnyRole } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getGrowthMetrics } from '@/lib/growth-metrics'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-blog-growth', 120, ['admin', 'editor'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const growth = await getGrowthMetrics()
    return withRequestId(ctx, NextResponse.json(growth))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load growth metrics')
  }
}
