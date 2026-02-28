import { NextResponse } from 'next/server'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { buildRagAnswer, semanticSearchPosts } from '@/lib/semantic-search'
import { sanitizeText } from '@/lib/sanitize'
import { cacheGetJson, cacheSetJson } from '@/lib/distributed-cache'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const { searchParams } = new URL(request.url)
    const q = sanitizeText(searchParams.get('q') ?? '', 240).trim()
    if (!q) {
      return jsonApiError(ctx, 400, 'q is required')
    }
    const cacheKey = `semantic:${q}`
    const cached = await cacheGetJson<{ results: Awaited<ReturnType<typeof semanticSearchPosts>>; rag: ReturnType<typeof buildRagAnswer> }>(cacheKey)
    const results = cached?.results ?? (await semanticSearchPosts(q, 8))
    const rag = cached?.rag ?? buildRagAnswer(q, results)
    if (!cached) {
      await cacheSetJson(cacheKey, { results, rag }, 60 * 5)
    }
    return withRequestId(
      ctx,
      NextResponse.json({
        query: q,
        results: results.map((item) => ({
          slug: item.slug,
          title: item.title,
          excerpt: item.excerpt,
          score: item.score,
          matchedTerms: item.matchedTerms,
          context: item.context,
        })),
        rag,
      })
    )
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not perform semantic search')
  }
}
