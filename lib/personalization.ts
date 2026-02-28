import { listPublishedPosts } from '@/lib/blog-store'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'

type VisitorSignal = {
  tag: string
  weight: number
}

async function getVisitorSignals(visitorId: string) {
  if (!isDatabaseEnabled()) return [] as VisitorSignal[]
  const rows = await prisma.auditEvent.findMany({
    where: {
      actorMemberId: visitorId,
      action: { in: ['tag_click', 'post_cta_click', 'share_click', 'scroll_depth'] },
    },
    orderBy: { at: 'desc' },
    take: 200,
    select: { action: true, meta: true },
  })
  const scores = new Map<string, number>()
  for (const row of rows) {
    const meta = (row.meta ?? {}) as Record<string, unknown>
    const tag = typeof meta.tag === 'string' ? meta.tag : null
    const cta = typeof meta.cta === 'string' ? meta.cta : null
    const depth = typeof meta.depth === 'number' ? meta.depth : 0
    if (tag) {
      scores.set(tag, (scores.get(tag) ?? 0) + 3)
    }
    if (cta) {
      scores.set(cta, (scores.get(cta) ?? 0) + 2)
    }
    if (depth >= 75 && tag) {
      scores.set(tag, (scores.get(tag) ?? 0) + 1)
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag, weight]) => ({ tag, weight }))
}

export async function getPersonalizedPosts(visitorId?: string, limit = 6) {
  const listing = await listPublishedPosts({ page: 1, pageSize: 60 })
  if (!visitorId) {
    return listing.items.slice(0, limit)
  }
  const signals = await getVisitorSignals(visitorId)
  if (signals.length === 0) {
    return listing.items.slice(0, limit)
  }
  const scoreMap = new Map(signals.map((s) => [s.tag.toLowerCase(), s.weight]))
  return [...listing.items]
    .map((post) => {
      const tags = [...post.tags, ...post.categories].map((value) => value.toLowerCase())
      const score = tags.reduce((acc, tag) => acc + (scoreMap.get(tag) ?? 0), 0)
      return { post, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post)
}
