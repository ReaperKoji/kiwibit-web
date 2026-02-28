import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { requireCsrfHeader, requireSession } from '@/lib/api-guards'
import { appendAuditLog } from '@/lib/audit-log'
import { listAllPostsForAdmin, transitionPostStatus, upsertDraftPost } from '@/lib/blog-store'
import { createBlogPreviewToken } from '@/lib/blog-preview-token'
import { blogPostActionSchema } from '@/lib/validation'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { sanitizeMarkdown, sanitizeStringArray, sanitizeText } from '@/lib/sanitize'
import { getUniqueApproversForSlug } from '@/lib/blog-approval'

type AdminPostInput = {
  slug?: string
  title: string
  excerpt: string
  coverImage: string
  authorId: string
  tags: string[]
  categories: string[]
  featured: boolean
  draftContent: string
}

function sanitizePostInput(post: AdminPostInput): AdminPostInput {
  return {
    ...post,
    slug: post.slug ? sanitizeText(post.slug, 120) : undefined,
    title: sanitizeText(post.title, 180),
    excerpt: sanitizeText(post.excerpt, 320),
    coverImage: sanitizeText(post.coverImage, 500),
    authorId: sanitizeText(post.authorId, 80),
    tags: sanitizeStringArray(post.tags, 40),
    categories: sanitizeStringArray(post.categories, 40),
    draftContent: sanitizeMarkdown(post.draftContent, 20000),
  }
}

function actorRoleForTransition(role: string): 'member' | 'admin' {
  return role === 'admin' ? 'admin' : 'member'
}

function requiresDoubleApproval() {
  return process.env.BLOG_REQUIRE_DOUBLE_APPROVAL !== 'false'
}

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireSession(request, 'admin-posts', 120)
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const { session } = checked
    const posts = await listAllPostsForAdmin()
    if (session.role === 'admin' || session.role === 'editor') {
      return withRequestId(ctx, NextResponse.json({ posts }))
    }
    return withRequestId(ctx, NextResponse.json({ posts: posts.filter((post) => post.authorId === session.memberId) }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load posts')
  }
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireSession(request, 'admin-posts-action', 120)
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const csrf = await requireCsrfHeader(request)
    if (csrf !== true) return withRequestId(ctx, csrf.response)
    const { session, ip } = checked

    const parsed = blogPostActionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonApiError(ctx, 400, 'Invalid payload', { details: parsed.error.flatten() })
    }
    const payload = parsed.data

    if (payload.action === 'save') {
      if (!payload.post) {
        return jsonApiError(ctx, 400, 'post is required')
      }
      const safePost = sanitizePostInput(payload.post)
      if (session.role !== 'admin') {
        safePost.authorId = session.memberId
      }
      const post = await upsertDraftPost(safePost)
      revalidateTag('blog-posts')
      revalidateTag(`blog-post:${post.slug}`)
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: session.memberId,
        actorRole: session.role,
        targetMemberId: post.authorId,
        action: 'blog_post_saved',
        ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { slug: post.slug, requestId: ctx.requestId },
      })
      return withRequestId(ctx, NextResponse.json({ ok: true, post }))
    }

    if (!payload.slug) {
      return jsonApiError(ctx, 400, 'slug is required')
    }

    if (session.role !== 'admin' && session.role !== 'editor') {
      const all = await listAllPostsForAdmin()
      const target = all.find((post) => post.slug === payload.slug)
      if (!target) {
        return jsonApiError(ctx, 404, 'Not found')
      }
      if (target.authorId !== session.memberId) {
        return jsonApiError(ctx, 403, 'Forbidden')
      }
    }

    if (payload.action === 'preview') {
      const token = createBlogPreviewToken(payload.slug, 60 * 20)
      return withRequestId(ctx, NextResponse.json({ ok: true, previewUrl: `/blog/preview/${payload.slug}?token=${token}` }))
    }

    if (payload.action === 'submit_review') {
      const post = await transitionPostStatus(payload.slug, 'in_review', actorRoleForTransition(session.role))
      if (!post) return jsonApiError(ctx, 404, 'Not found')
      revalidateTag('blog-posts')
      revalidateTag(`blog-post:${post.slug}`)
      return withRequestId(ctx, NextResponse.json({ ok: true, post }))
    }

    if (payload.action === 'publish') {
      if (session.role === 'admin' && requiresDoubleApproval()) {
        const approvers = await getUniqueApproversForSlug(payload.slug)
        if (approvers.length < 2) {
          await appendAuditLog({
            at: new Date().toISOString(),
            actorMemberId: session.memberId,
            actorRole: session.role,
            targetMemberId: session.memberId,
            action: 'blog_post_publish_blocked',
            ip,
            userAgent: request.headers.get('user-agent') ?? 'unknown',
            meta: { slug: payload.slug, approversCount: approvers.length, requestId: ctx.requestId },
          })
          return jsonApiError(ctx, 409, 'Double approval required before publishing')
        }
      }
      const post = await transitionPostStatus(payload.slug, 'published', actorRoleForTransition(session.role))
      if (!post) return jsonApiError(ctx, 404, 'Not found')
      revalidateTag('blog-posts')
      revalidateTag(`blog-post:${post.slug}`)
      return withRequestId(ctx, NextResponse.json({ ok: true, post }))
    }

    if (payload.action === 'schedule') {
      if (!payload.scheduledFor) {
        return jsonApiError(ctx, 400, 'scheduledFor is required')
      }
      const post = await transitionPostStatus(payload.slug, 'scheduled', actorRoleForTransition(session.role), payload.scheduledFor)
      if (!post) return jsonApiError(ctx, 404, 'Not found')
      revalidateTag('blog-posts')
      revalidateTag(`blog-post:${post.slug}`)
      return withRequestId(ctx, NextResponse.json({ ok: true, post }))
    }

    if (payload.action === 'approve') {
      if (session.role !== 'admin') {
        return jsonApiError(ctx, 403, 'Forbidden')
      }
      await appendAuditLog({
        at: new Date().toISOString(),
        actorMemberId: session.memberId,
        actorRole: session.role,
        targetMemberId: session.memberId,
        action: 'blog_post_approved',
        ip,
        userAgent: request.headers.get('user-agent') ?? 'unknown',
        meta: { slug: payload.slug, requestId: ctx.requestId },
      })
      const approvers = await getUniqueApproversForSlug(payload.slug)
      const post = await transitionPostStatus(payload.slug, approvers.length >= 2 ? 'published' : 'in_review', 'admin')
      if (!post) return jsonApiError(ctx, 404, 'Not found')
      revalidateTag('blog-posts')
      revalidateTag(`blog-post:${post.slug}`)
      return withRequestId(
        ctx,
        NextResponse.json({
          ok: true,
          post,
          approvals: approvers.length,
          requiredApprovals: 2,
        })
      )
    }

    return jsonApiError(ctx, 400, 'Unsupported action')
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not process action')
  }
}
