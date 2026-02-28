import { NextResponse } from 'next/server'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getPersonalizedPosts } from '@/lib/personalization'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId') ?? undefined
    const posts = await getPersonalizedPosts(visitorId, 6)
    return withRequestId(ctx, NextResponse.json({ posts }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load recommendations')
  }
}
