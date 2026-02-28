import { NextResponse } from 'next/server'
import { requireAdmin, requireCsrfHeader } from '@/lib/api-guards'
import { listPendingComments, moderateComment } from '@/lib/blog-comments-store'
import { z } from 'zod'

const moderationSchema = z.object({
  commentId: z.string().min(1),
  status: z.enum(['approved', 'rejected']),
})

export async function GET(request: Request) {
  const checked = await requireAdmin(request, 'admin-comments', 120)
  if ('response' in checked) return checked.response
  const comments = await listPendingComments()
  return NextResponse.json({ comments })
}

export async function POST(request: Request) {
  const checked = await requireAdmin(request, 'admin-comments-action', 120)
  if ('response' in checked) return checked.response
  const csrf = await requireCsrfHeader(request)
  if (csrf !== true) return csrf.response
  const parsed = moderationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const updated = await moderateComment(parsed.data.commentId, parsed.data.status)
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, comment: updated })
}
