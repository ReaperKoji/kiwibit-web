import { promises as fs } from 'fs'
import path from 'path'
import { listAllPostsForAdmin } from '@/lib/blog-store'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

type ActionName = 'scroll_depth' | 'post_dwell' | 'post_cta_click' | 'tag_click' | 'share_click'

type RawEvent = {
  action: ActionName
  at: string
  actorMemberId: string
  meta?: Record<string, unknown> | null
}

export type BlogPostAnalytics = {
  slug: string
  title: string
  authorId: string
  status: string
  publishedAt?: string
  scrollAvgDepth: number
  dwellAvgSec: number
  shareClicks: number
  ctaClicks: number
  ctrPercent: number
  interactions: number
}

const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl')
const TRACKED_ACTIONS: ActionName[] = ['scroll_depth', 'post_dwell', 'post_cta_click', 'tag_click', 'share_click']

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function extractSlug(meta: Record<string, unknown> | null) {
  const slug = meta?.slug
  if (typeof slug !== 'string' || slug.trim().length === 0) return null
  return slug
}

function extractNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

async function readRawEvents(): Promise<RawEvent[]> {
  if (isDatabaseEnabled()) {
    const rows = await prisma.auditEvent.findMany({
      where: {
        action: { in: TRACKED_ACTIONS },
      },
      orderBy: { at: 'desc' },
      take: 10000,
    })
    return rows.map((row) => ({
      action: row.action as ActionName,
      at: row.at.toISOString(),
      actorMemberId: row.actorMemberId,
      meta: asRecord(row.meta),
    }))
  }

  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }

  try {
    const raw = await fs.readFile(AUDIT_LOG_PATH, 'utf8')
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
    const events: RawEvent[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as {
          action?: string
          at?: string
          actorMemberId?: string
          meta?: Record<string, unknown>
        }
        if (!parsed.action || !TRACKED_ACTIONS.includes(parsed.action as ActionName)) continue
        events.push({
          action: parsed.action as ActionName,
          at: parsed.at ?? new Date().toISOString(),
          actorMemberId: parsed.actorMemberId ?? 'unknown',
          meta: asRecord(parsed.meta),
        })
      } catch {
        // Ignore malformed audit lines.
      }
    }
    return events
  } catch {
    return []
  }
}

export async function listBlogAnalyticsByPost(memberId?: string) {
  const [posts, events] = await Promise.all([listAllPostsForAdmin(), readRawEvents()])
  const filteredPosts = memberId ? posts.filter((post) => post.authorId === memberId) : posts
  const postMap = new Map(filteredPosts.map((post) => [post.slug, post]))

  const stats = new Map<
    string,
    {
      scrollDepths: number[]
      dwellMs: number[]
      shareClicks: number
      ctaClicks: number
      tagClicks: number
    }
  >()

  for (const event of events) {
    const slug = extractSlug(event.meta ?? null)
    if (!slug || !postMap.has(slug)) continue

    if (!stats.has(slug)) {
      stats.set(slug, { scrollDepths: [], dwellMs: [], shareClicks: 0, ctaClicks: 0, tagClicks: 0 })
    }
    const postStats = stats.get(slug)!

    if (event.action === 'scroll_depth') {
      const depth = extractNumber(event.meta?.depth)
      if (depth !== null) postStats.scrollDepths.push(depth)
      continue
    }
    if (event.action === 'post_dwell') {
      const ms = extractNumber(event.meta?.ms)
      if (ms !== null) postStats.dwellMs.push(ms)
      continue
    }
    if (event.action === 'share_click') {
      postStats.shareClicks += 1
      continue
    }
    if (event.action === 'post_cta_click') {
      postStats.ctaClicks += 1
      continue
    }
    if (event.action === 'tag_click') {
      postStats.tagClicks += 1
    }
  }

  const result: BlogPostAnalytics[] = filteredPosts.map((post) => {
    const data = stats.get(post.slug) ?? {
      scrollDepths: [],
      dwellMs: [],
      shareClicks: 0,
      ctaClicks: 0,
      tagClicks: 0,
    }
    const scrollAvgDepth =
      data.scrollDepths.length > 0 ? data.scrollDepths.reduce((acc, value) => acc + value, 0) / data.scrollDepths.length : 0
    const dwellAvgSec =
      data.dwellMs.length > 0 ? data.dwellMs.reduce((acc, value) => acc + value, 0) / data.dwellMs.length / 1000 : 0
    const engagementBase = data.scrollDepths.length + data.dwellMs.length + data.tagClicks + data.ctaClicks + data.shareClicks
    const ctrPercent = engagementBase > 0 ? ((data.ctaClicks + data.shareClicks) / engagementBase) * 100 : 0

    return {
      slug: post.slug,
      title: post.title,
      authorId: post.authorId,
      status: post.status,
      publishedAt: post.publishedAt,
      scrollAvgDepth: Number(scrollAvgDepth.toFixed(1)),
      dwellAvgSec: Number(dwellAvgSec.toFixed(1)),
      shareClicks: data.shareClicks,
      ctaClicks: data.ctaClicks,
      ctrPercent: Number(ctrPercent.toFixed(1)),
      interactions: engagementBase,
    }
  })

  return result.sort((a, b) => b.interactions - a.interactions || b.ctrPercent - a.ctrPercent)
}
