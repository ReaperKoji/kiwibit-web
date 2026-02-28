import { NextResponse } from 'next/server'
import { requireAnyRole } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getMemberFunnelMetrics, getMemberFunnelSeries, seriesToCsv } from '@/lib/member-funnel-metrics'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-members-metrics', 120, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period')
    const format = searchParams.get('format')
    const period: 7 | 30 = periodParam === '30' ? 30 : 7
    const [metrics, series] = await Promise.all([getMemberFunnelMetrics(), getMemberFunnelSeries(period)])

    if (format === 'csv') {
      const csv = seriesToCsv(series)
      const response = new NextResponse(csv, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="member-funnel-${period}d.csv"`,
        },
      })
      return withRequestId(ctx, response)
    }

    return withRequestId(ctx, NextResponse.json({ metrics, series, period }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load member metrics')
  }
}
