import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

export type BlogCommentStatus = 'pending' | 'approved' | 'rejected'

export type BlogComment = {
  id: string
  slug: string
  name: string
  email: string
  message: string
  createdAt: string
  status: BlogCommentStatus
  ip: string
}

type CommentStore = {
  comments: BlogComment[]
}

const COMMENTS_PATH = path.join(process.cwd(), 'data', 'blog-comments.json')

async function readStore(): Promise<CommentStore> {
  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }
  try {
    const raw = await fs.readFile(COMMENTS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as CommentStore
    if (!Array.isArray(parsed.comments)) return { comments: [] }
    return parsed
  } catch {
    return { comments: [] }
  }
}

async function writeStore(data: CommentStore) {
  await fs.writeFile(COMMENTS_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export async function listApprovedCommentsBySlug(slug: string) {
  if (isDatabaseEnabled()) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!post) return []
    const comments = await prisma.blogComment.findMany({
      where: { postId: post.id, status: 'approved' },
      orderBy: { createdAt: 'asc' },
    })
    return comments.map((comment) => ({
      id: comment.id,
      slug,
      name: comment.name,
      email: comment.email,
      message: comment.message,
      createdAt: comment.createdAt.toISOString(),
      status: comment.status,
      ip: comment.ip,
    }))
  }

  const store = await readStore()
  return store.comments
    .filter((comment) => comment.slug === slug && comment.status === 'approved')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export async function listPendingComments() {
  if (isDatabaseEnabled()) {
    const comments = await prisma.blogComment.findMany({
      where: { status: 'pending' },
      include: { post: { select: { slug: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return comments.map((comment) => ({
      id: comment.id,
      slug: comment.post.slug,
      name: comment.name,
      email: comment.email,
      message: comment.message,
      createdAt: comment.createdAt.toISOString(),
      status: comment.status,
      ip: comment.ip,
    }))
  }

  const store = await readStore()
  return store.comments
    .filter((comment) => comment.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createPendingComment(input: { slug: string; name: string; email: string; message: string; ip: string }) {
  if (isDatabaseEnabled()) {
    const post = await prisma.blogPost.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    })
    if (!post) {
      throw new Error(`Post not found for slug ${input.slug}`)
    }
    const created = await prisma.blogComment.create({
      data: {
        postId: post.id,
        name: input.name,
        email: input.email,
        message: input.message,
        status: 'pending',
        ip: input.ip,
      },
    })
    return {
      id: created.id,
      slug: input.slug,
      name: created.name,
      email: created.email,
      message: created.message,
      createdAt: created.createdAt.toISOString(),
      status: created.status,
      ip: created.ip,
    }
  }

  const store = await readStore()
  const created: BlogComment = {
    id: randomUUID(),
    slug: input.slug,
    name: input.name,
    email: input.email,
    message: input.message,
    createdAt: new Date().toISOString(),
    status: 'pending',
    ip: input.ip,
  }
  store.comments.push(created)
  await writeStore(store)
  return created
}

export async function moderateComment(commentId: string, status: BlogCommentStatus) {
  if (isDatabaseEnabled()) {
    try {
      const updated = await prisma.blogComment.update({
        where: { id: commentId },
        data: { status },
        include: { post: { select: { slug: true } } },
      })
      return {
        id: updated.id,
        slug: updated.post.slug,
        name: updated.name,
        email: updated.email,
        message: updated.message,
        createdAt: updated.createdAt.toISOString(),
        status: updated.status,
        ip: updated.ip,
      }
    } catch {
      return null
    }
  }

  const store = await readStore()
  const comment = store.comments.find((item) => item.id === commentId)
  if (!comment) return null
  comment.status = status
  await writeStore(store)
  return comment
}
