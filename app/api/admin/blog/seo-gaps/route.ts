import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { buildSeoGapReport } from '@/lib/seo-gaps'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireSession(request, 'admin-blog-seo-gaps', 120)
    if ('response' in checked) return withRequestId(ctx, checked.response)

    const report = await buildSeoGapReport()
    return withRequestId(ctx, NextResponse.json(report))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load SEO gaps report')
  }
}
