import { NextResponse } from 'next/server'
import { listPublishedPosts, listUniqueTagsAndCategories, publishScheduledDuePosts } from '@/lib/blog-store'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value ?? '')
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    await publishScheduledDuePosts()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? undefined
    const tag = searchParams.get('tag') ?? undefined
    const category = searchParams.get('category') ?? undefined
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), 9)

    const listing = await listPublishedPosts({ q, tag, category, page, pageSize })
    const filters = await listUniqueTagsAndCategories()
    const response = NextResponse.json({
      ...listing,
      tags: filters.tags,
      categories: filters.categories,
    })
    response.headers.set('cache-control', 'public, s-maxage=120, stale-while-revalidate=600')
    return withRequestId(
      ctx,
      response
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load blog posts')
  }
}
