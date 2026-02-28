import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { enqueueJob, type QueueJob } from '@/lib/job-queue'

const schema = z.object({
  type: z.enum(['embeddings_reindex', 'newsletter_sync', 'growth_rollup', 'github_sync']),
  email: z.string().email().optional(),
  memberId: z.string().optional(),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-jobs-enqueue', 120, ['admin', 'editor'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return jsonApiError(ctx, 400, 'Invalid payload')

    const payload = parsed.data
    const job: QueueJob =
      payload.type === 'newsletter_sync'
        ? { type: 'newsletter_sync', email: payload.email ?? '' }
        : payload.type === 'github_sync'
          ? { type: 'github_sync', memberId: payload.memberId }
          : payload.type === 'growth_rollup'
            ? { type: 'growth_rollup' }
            : { type: 'embeddings_reindex' }

    await enqueueJob(job)
    return withRequestId(ctx, NextResponse.json({ ok: true, job }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not enqueue job')
  }
}
