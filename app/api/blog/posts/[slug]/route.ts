import { NextResponse } from 'next/server'
import { getPublishedPostBySlug, listRelatedPosts } from '@/lib/blog-store'
import { listApprovedCommentsBySlug } from '@/lib/blog-comments-store'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

type Params = {
  params: Promise<{ slug: string }>
}

export async function GET(_: Request, { params }: Params) {
  const ctx = createApiRequestContext(_)
  try {
    const { slug } = await params
    const post = await getPublishedPostBySlug(slug)
    if (!post) {
      return jsonApiError(ctx, 404, 'Not found')
    }
    const related = await listRelatedPosts(slug, 3)
    const comments = await listApprovedCommentsBySlug(slug)
    const response = NextResponse.json({ post, related, comments })
    response.headers.set('cache-control', 'public, s-maxage=120, stale-while-revalidate=600')
    return withRequestId(ctx, response)
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load post')
  }
}
