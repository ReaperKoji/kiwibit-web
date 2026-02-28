import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeText } from '@/lib/sanitize'
import { buildRagAnswer, semanticSearchPosts } from '@/lib/semantic-search'
import { reindexBlogEmbeddings } from '@/lib/embeddings'
import { isFeatureEnabled } from '@/lib/feature-flags'

const schema = z.object({
  action: z.enum(['search', 'reindex']),
  q: z.string().max(240).optional(),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-semantic', 120, ['admin', 'editor'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return jsonApiError(ctx, 400, 'Invalid payload')

    if (parsed.data.action === 'reindex') {
      const ff = await isFeatureEnabled('semantic_embeddings')
      if (!ff) return jsonApiError(ctx, 409, 'semantic_embeddings flag is disabled')
      const result = await reindexBlogEmbeddings()
      return withRequestId(ctx, NextResponse.json({ ok: true, result }))
    }

    const q = sanitizeText(parsed.data.q ?? '', 240).trim()
    if (!q) return jsonApiError(ctx, 400, 'q is required')
    const results = await semanticSearchPosts(q, 10)
    const rag = buildRagAnswer(q, results)
    return withRequestId(ctx, NextResponse.json({ ok: true, q, results, rag }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not execute semantic admin action')
  }
}
