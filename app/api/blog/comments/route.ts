import { NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/audit-log'
import { createPendingComment, listApprovedCommentsBySlug } from '@/lib/blog-comments-store'
import { getPublishedPostBySlug } from '@/lib/blog-store'
import { enforceRateLimit, getClientIp } from '@/lib/security'
import { blogCommentSchema } from '@/lib/validation'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeText } from '@/lib/sanitize'
import { z } from 'zod'

const commentSubmissionSchema = blogCommentSchema.extend({
  visitorId: z.string().max(80).optional(),
})

function classifyCommentRisk(message: string) {
  const lower = message.toLowerCase()
  const links = (message.match(/https?:\/\/|www\./gi) ?? []).length
  const blacklist = ['viagra', 'casino', 'bitcoin giveaway', 'free money', 'xxx', 'loan', 'forex signal']
  const suspiciousWords = blacklist.filter((word) => lower.includes(word))
  const repeatedChars = /(.)\1{6,}/.test(message)
  const uppercaseRatio = message.length > 0 ? (message.replace(/[^A-Z]/g, '').length / message.length) * 100 : 0
  const score =
    links * 35 +
    suspiciousWords.length * 30 +
    (repeatedChars ? 20 : 0) +
    (uppercaseRatio > 55 ? 15 : 0) +
    (message.length < 12 ? 10 : 0)
  return {
    score,
    reasons: [
      ...(links > 0 ? [`links:${links}`] : []),
      ...(suspiciousWords.length > 0 ? [`blacklist:${suspiciousWords.join(',')}`] : []),
      ...(repeatedChars ? ['repeated_chars'] : []),
      ...(uppercaseRatio > 55 ? [`uppercase_ratio:${uppercaseRatio.toFixed(1)}`] : []),
    ],
  }
}

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    if (!slug) {
      return jsonApiError(ctx, 400, 'slug is required')
    }
    const comments = await listApprovedCommentsBySlug(slug)
    return withRequestId(ctx, NextResponse.json({ comments }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load comments')
  }
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const ip = getClientIp(request)
    const rate = await enforceRateLimit(`blog-comment:${ip}`, 20)
    if (!rate.allowed) {
      return jsonApiError(ctx, 429, 'Too many requests')
    }

    const parsed = commentSubmissionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }
    const data = {
      ...parsed.data,
      name: sanitizeText(parsed.data.name, 80),
      email: sanitizeText(parsed.data.email, 120).toLowerCase(),
      message: sanitizeText(parsed.data.message, 1200),
    }
    const post = await getPublishedPostBySlug(data.slug)
    if (!post) {
      return jsonApiError(ctx, 404, 'Post not found')
    }
    const risk = classifyCommentRisk(data.message)
    if (risk.score >= 60) {
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: 'visitor',
        actorRole: 'public',
        targetMemberId: post.authorId,
        action: 'blog_comment_blocked_ml',
        ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { slug: data.slug, requestId: ctx.requestId, risk },
      })
      return jsonApiError(ctx, 400, 'Comment flagged as spam')
    }

    const comment = await createPendingComment({
      slug: data.slug,
      name: data.name,
      email: data.email,
      message: data.message,
      ip,
    })

    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: parsed.data.visitorId ? sanitizeText(parsed.data.visitorId, 80) : 'visitor',
      actorRole: 'public',
      targetMemberId: post.authorId,
      action: 'blog_comment_created',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: { commentId: comment.id, slug: data.slug, requestId: ctx.requestId, risk },
    })

    return withRequestId(ctx, NextResponse.json({ ok: true, commentStatus: comment.status }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not create comment')
  }
}
