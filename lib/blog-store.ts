import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { BLOG_SEED_POSTS, type BlogPost, type BlogPostStatus } from '@/data/blog-seed'
import { BLOG_FIXED_CATEGORIES } from '@/data/blog-editorial'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

const POSTS_PATH = path.join(process.cwd(), 'data', 'blog-posts.json')

type BlogStore = {
  posts: BlogPost[]
}

export type BlogQuery = {
  q?: string
  tag?: string
  category?: string
  page?: number
  pageSize?: number
}

type UpsertPostInput = {
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

function nowIso() {
  return new Date().toISOString()
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeTag(value: string) {
  return normalizeSlug(value).slice(0, 40)
}

function normalizeCategories(categories: string[]) {
  const allowed = new Set(BLOG_FIXED_CATEGORIES)
  const normalized = categories.filter((category): category is (typeof BLOG_FIXED_CATEGORIES)[number] => allowed.has(category as (typeof BLOG_FIXED_CATEGORIES)[number]))
  return normalized.length > 0 ? normalized : ['Engineering']
}

async function readStore(): Promise<BlogStore> {
  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }
  try {
    const raw = await fs.readFile(POSTS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as BlogStore
    if (!Array.isArray(parsed.posts) || parsed.posts.length === 0) {
      return { posts: BLOG_SEED_POSTS }
    }
    return parsed
  } catch {
    return { posts: BLOG_SEED_POSTS }
  }
}

async function writeStore(data: BlogStore) {
  await fs.writeFile(POSTS_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function byPublishDateDesc(a: BlogPost, b: BlogPost) {
  const at = new Date(a.publishedAt ?? a.updatedAt).getTime()
  const bt = new Date(b.publishedAt ?? b.updatedAt).getTime()
  return bt - at
}

function mapDbPostToBlogPost(post: {
  id: string
  slug: string
  title: string
  excerpt: string
  coverImage: string
  authorId: string
  tags: string[]
  categories: string[]
  status: string
  featured: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  scheduledFor: Date | null
  draftContent: string
  publishedContent: string | null
}): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    authorId: post.authorId,
    tags: post.tags,
    categories: post.categories,
    status: post.status as BlogPostStatus,
    featured: post.featured,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString(),
    scheduledFor: post.scheduledFor?.toISOString(),
    draftContent: post.draftContent,
    publishedContent: post.publishedContent ?? undefined,
  }
}

function applyFilters(posts: BlogPost[], query: BlogQuery) {
  const q = query.q?.toLowerCase().trim()
  return posts.filter((post) => {
    if (query.tag && !post.tags.includes(query.tag)) return false
    if (query.category && !post.categories.includes(query.category)) return false
    if (q) {
      const text = `${post.title} ${post.excerpt} ${post.tags.join(' ')} ${post.categories.join(' ')}`.toLowerCase()
      if (!text.includes(q)) return false
    }
    return true
  })
}

export async function listPublishedPosts(query: BlogQuery = {}) {
  if (isDatabaseEnabled()) {
    await publishScheduledDuePosts()
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(24, Math.max(1, query.pageSize ?? 9))
    const where = {
      status: 'published' as const,
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.category ? { categories: { has: query.category } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { excerpt: { contains: query.q, mode: 'insensitive' as const } },
              { tags: { has: query.q } },
              { categories: { has: query.q } },
            ],
          }
        : {}),
    }
    const [total, rows] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])
    const items = rows.map(mapDbPostToBlogPost)
    const featuredRow = await prisma.blogPost.findFirst({
      where: { ...where, featured: true },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })
    const featured = featuredRow ? mapDbPostToBlogPost(featuredRow) : items[0] ?? null
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    return { items, featured, total, totalPages, page, pageSize }
  }

  await publishScheduledDuePosts()
  const store = await readStore()
  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(24, Math.max(1, query.pageSize ?? 9))
  const published = store.posts.filter((post) => post.status === 'published').sort(byPublishDateDesc)
  const filtered = applyFilters(published, query)
  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)
  const featured = filtered.find((post) => post.featured) ?? filtered[0] ?? null
  return { items, featured, total, totalPages, page, pageSize }
}

export async function getPublishedPostBySlug(slug: string) {
  if (isDatabaseEnabled()) {
    await publishScheduledDuePosts()
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'published' },
    })
    return post ? mapDbPostToBlogPost(post) : null
  }

  await publishScheduledDuePosts()
  const store = await readStore()
  return store.posts.find((post) => post.slug === slug && post.status === 'published') ?? null
}

export async function getPostBySlug(slug: string) {
  if (isDatabaseEnabled()) {
    const post = await prisma.blogPost.findUnique({ where: { slug } })
    return post ? mapDbPostToBlogPost(post) : null
  }

  const store = await readStore()
  return store.posts.find((post) => post.slug === slug) ?? null
}

export async function listAllPostsForAdmin() {
  if (isDatabaseEnabled()) {
    const rows = await prisma.blogPost.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(mapDbPostToBlogPost)
  }

  const store = await readStore()
  return [...store.posts].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function upsertDraftPost(input: UpsertPostInput) {
  const normalizedTags = Array.from(new Set(input.tags.map(normalizeTag).filter(Boolean))).slice(0, 12)
  const normalizedCategories = normalizeCategories(Array.from(new Set(input.categories)).slice(0, 3))

  if (isDatabaseEnabled()) {
    const computedSlug = normalizeSlug(input.slug && input.slug.length > 0 ? input.slug : input.title)
    const post = await prisma.blogPost.upsert({
      where: { slug: computedSlug },
      create: {
        slug: computedSlug,
        title: input.title,
        excerpt: input.excerpt,
        coverImage: input.coverImage,
        authorId: input.authorId,
        tags: normalizedTags,
        categories: normalizedCategories,
        featured: input.featured,
        status: 'draft',
        draftContent: input.draftContent,
      },
      update: {
        title: input.title,
        excerpt: input.excerpt,
        coverImage: input.coverImage,
        authorId: input.authorId,
        tags: normalizedTags,
        categories: normalizedCategories,
        featured: input.featured,
        draftContent: input.draftContent,
        status: 'draft',
      },
    })
    return mapDbPostToBlogPost(post)
  }

  const store = await readStore()
  const computedSlug = normalizeSlug(input.slug && input.slug.length > 0 ? input.slug : input.title)
  const now = nowIso()
  const existing = store.posts.find((post) => post.slug === computedSlug)
  if (existing) {
    existing.title = input.title
    existing.excerpt = input.excerpt
    existing.coverImage = input.coverImage
    existing.authorId = input.authorId
    existing.tags = normalizedTags
    existing.categories = normalizedCategories
    existing.featured = input.featured
    existing.draftContent = input.draftContent
    existing.updatedAt = now
    if (existing.status === 'published') existing.status = 'draft'
    await writeStore(store)
    return existing
  }

  const created: BlogPost = {
    id: randomUUID(),
    slug: computedSlug,
    title: input.title,
    excerpt: input.excerpt,
    coverImage: input.coverImage,
    authorId: input.authorId,
    tags: normalizedTags,
    categories: normalizedCategories,
    featured: input.featured,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    draftContent: input.draftContent,
  }
  store.posts.push(created)
  await writeStore(store)
  return created
}

export async function transitionPostStatus(slug: string, nextStatus: BlogPostStatus, actorRole: 'member' | 'admin', scheduleAt?: string) {
  if (isDatabaseEnabled()) {
    const post = await prisma.blogPost.findUnique({ where: { slug } })
    if (!post) return null

    let status: BlogPostStatus = nextStatus
    let publishedAt: Date | null | undefined = post.publishedAt
    let publishedContent: string | null | undefined = post.publishedContent
    let scheduledFor: Date | null | undefined = post.scheduledFor

    if (nextStatus === 'published' && actorRole !== 'admin') {
      status = 'in_review'
    } else if (nextStatus === 'scheduled') {
      status = 'scheduled'
      scheduledFor = scheduleAt ? new Date(scheduleAt) : null
    } else if (nextStatus === 'published') {
      status = 'published'
      publishedAt = new Date()
      publishedContent = post.draftContent
      scheduledFor = null
    }

    const updated = await prisma.blogPost.update({
      where: { slug },
      data: {
        status,
        scheduledFor,
        publishedAt,
        publishedContent,
      },
    })
    return mapDbPostToBlogPost(updated)
  }

  const store = await readStore()
  const post = store.posts.find((item) => item.slug === slug)
  if (!post) return null

  if (nextStatus === 'published' && actorRole !== 'admin') {
    post.status = 'in_review'
  } else if (nextStatus === 'scheduled') {
    post.status = 'scheduled'
    post.scheduledFor = scheduleAt
  } else if (nextStatus === 'published') {
    post.status = 'published'
    post.publishedAt = nowIso()
    post.publishedContent = post.draftContent
    post.scheduledFor = undefined
  } else {
    post.status = nextStatus
  }

  post.updatedAt = nowIso()
  await writeStore(store)
  return post
}

export async function publishScheduledDuePosts() {
  if (isDatabaseEnabled()) {
    const now = new Date()
    const due = await prisma.blogPost.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: { lte: now },
      },
      select: { id: true, draftContent: true },
    })
    if (due.length === 0) return
    await Promise.all(
      due.map((post) =>
        prisma.blogPost.update({
          where: { id: post.id },
          data: {
            status: 'published',
            publishedAt: now,
            publishedContent: post.draftContent,
            scheduledFor: null,
          },
        })
      )
    )
    return
  }

  const store = await readStore()
  let changed = false
  const now = Date.now()
  for (const post of store.posts) {
    if (post.status !== 'scheduled' || !post.scheduledFor) continue
    if (new Date(post.scheduledFor).getTime() <= now) {
      post.status = 'published'
      post.publishedAt = nowIso()
      post.publishedContent = post.draftContent
      post.updatedAt = nowIso()
      post.scheduledFor = undefined
      changed = true
    }
  }
  if (changed) await writeStore(store)
}

export async function listRelatedPosts(slug: string, limit = 3) {
  const base = await getPublishedPostBySlug(slug)
  if (!base) return []

  if (isDatabaseEnabled()) {
    const rows = await prisma.blogPost.findMany({
      where: {
        status: 'published',
        slug: { not: slug },
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })
    const published = rows.map(mapDbPostToBlogPost)
    const scored = published
      .map((post) => {
        const tagScore = post.tags.filter((tag) => base.tags.includes(tag)).length * 2
        const categoryScore = post.categories.filter((cat) => base.categories.includes(cat)).length * 3
        return { post, score: tagScore + categoryScore }
      })
      .sort((a, b) => b.score - a.score || byPublishDateDesc(a.post, b.post))
    return scored.slice(0, limit).map((item) => item.post)
  }

  const store = await readStore()
  const published = store.posts.filter((post) => post.status === 'published' && post.slug !== slug)
  const scored = published
    .map((post) => {
      const tagScore = post.tags.filter((tag) => base.tags.includes(tag)).length * 2
      const categoryScore = post.categories.filter((cat) => base.categories.includes(cat)).length * 3
      return { post, score: tagScore + categoryScore }
    })
    .sort((a, b) => b.score - a.score || byPublishDateDesc(a.post, b.post))
  return scored.slice(0, limit).map((item) => item.post)
}

export async function listUniqueTagsAndCategories() {
  if (isDatabaseEnabled()) {
    const published = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: { tags: true, categories: true },
    })
    const tags = Array.from(new Set(published.flatMap((post) => post.tags))).sort()
    const categories = Array.from(new Set(published.flatMap((post) => post.categories))).sort()
    return { tags, categories }
  }

  const store = await readStore()
  const published = store.posts.filter((post) => post.status === 'published')
  const tags = Array.from(new Set(published.flatMap((post) => post.tags))).sort()
  const categories = Array.from(new Set(published.flatMap((post) => post.categories))).sort()
  return { tags, categories }
}

export async function listPublishedPostsByAuthor(authorId: string) {
  if (isDatabaseEnabled()) {
    await publishScheduledDuePosts()
    const rows = await prisma.blogPost.findMany({
      where: { status: 'published', authorId },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    })
    return rows.map(mapDbPostToBlogPost)
  }

  await publishScheduledDuePosts()
  const store = await readStore()
  return store.posts
    .filter((post) => post.status === 'published' && post.authorId === authorId)
    .sort(byPublishDateDesc)
}

export async function listPublishedSlugs() {
  if (isDatabaseEnabled()) {
    await publishScheduledDuePosts()
    const rows = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: { slug: true },
    })
    return rows.map((post) => post.slug)
  }

  await publishScheduledDuePosts()
  const store = await readStore()
  return store.posts.filter((post) => post.status === 'published').map((post) => post.slug)
}
