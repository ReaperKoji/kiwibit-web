import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAnyRole, requireCsrfHeader } from '@/lib/api-guards'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeMarkdown, sanitizeText } from '@/lib/sanitize'
import { suggestEditorImprovements } from '@/lib/ai-editor'

const schema = z.object({
  draftContent: z.string().min(60).max(30000),
  currentTitle: z.string().max(180).optional(),
  currentExcerpt: z.string().max(320).optional(),
})

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-posts-assist', 120, ['admin', 'editor'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)

    const parsed = schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }

    const assist = await suggestEditorImprovements({
      draftContent: sanitizeMarkdown(parsed.data.draftContent, 30000),
      currentTitle: parsed.data.currentTitle ? sanitizeText(parsed.data.currentTitle, 180) : undefined,
      currentExcerpt: parsed.data.currentExcerpt ? sanitizeText(parsed.data.currentExcerpt, 320) : undefined,
    })

    return withRequestId(ctx, NextResponse.json({ ok: true, assist }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not generate editor assist')
  }
}
