import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { isFeatureEnabled, setFeatureFlag, type FlagKey } from '@/lib/feature-flags'

const ALL_FLAGS: FlagKey[] = [
  'semantic_admin_panel',
  'semantic_embeddings',
  'ai_editor_openai',
  'activity_feed',
  'reputation_ranking',
  'warehouse_rollup',
  'queue_workers',
]

const schema = z.object({
  key: z.enum(ALL_FLAGS as [FlagKey, ...FlagKey[]]),
  value: z.boolean(),
})

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-feature-flags-list', 120, ['admin'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const entries = await Promise.all(
      ALL_FLAGS.map(async (key) => ({
        key,
        enabled: await isFeatureEnabled(key),
      }))
    )
    return withRequestId(ctx, NextResponse.json({ flags: entries }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load feature flags')
  }
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-feature-flags-set', 120, ['admin'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) return jsonApiError(ctx, 400, 'Invalid payload')
    await setFeatureFlag(parsed.data.key, parsed.data.value)
    return withRequestId(ctx, NextResponse.json({ ok: true }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not set feature flag')
  }
}
