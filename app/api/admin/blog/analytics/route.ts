import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { listBlogAnalyticsByPost } from '@/lib/blog-analytics'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireSession(request, 'admin-blog-analytics', 120)
    if ('response' in checked) return withRequestId(ctx, checked.response)

    const memberFilter = checked.session.role === 'admin' ? undefined : checked.session.memberId
    const posts = await listBlogAnalyticsByPost(memberFilter)
    return withRequestId(ctx, NextResponse.json({ posts }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load blog analytics')
  }
}
