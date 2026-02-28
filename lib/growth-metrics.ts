import { isDatabaseEnabled, prisma } from '@/lib/prisma'

type CohortPoint = {
  day: string
  newVisitors: number
  returningVisitors: number
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

function safeMeta(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {} as Record<string, unknown>
  return value as Record<string, unknown>
}

export async function getGrowthMetrics() {
  if (!isDatabaseEnabled()) {
    return {
      cohorts: [] as CohortPoint[],
      ctrByCta: [] as Array<{ cta: string; clicks: number }>,
      performanceBands: [] as Array<{ band: string; count: number }>,
      retentionRatePercent: 0,
    }
  }

  const rows = await prisma.auditEvent.findMany({
    where: {
      action: {
        in: ['scroll_depth', 'post_dwell', 'post_cta_click', 'share_click', 'performance_metric'],
      },
    },
    orderBy: { at: 'desc' },
    take: 8000,
    select: { at: true, actorMemberId: true, action: true, meta: true },
  })

  const firstSeen = new Map<string, string>()
  const perDayVisitors = new Map<string, Set<string>>()
  const returningByDay = new Map<string, Set<string>>()
  const cta = new Map<string, number>()
  const perfBands = new Map<string, number>([
    ['good', 0],
    ['needs-improvement', 0],
    ['poor', 0],
  ])

  for (const row of rows) {
    const day = formatDay(row.at)
    const visitor = row.actorMemberId || 'visitor'
    if (!perDayVisitors.has(day)) perDayVisitors.set(day, new Set())
    perDayVisitors.get(day)!.add(visitor)

    const seen = firstSeen.get(visitor)
    if (!seen) {
      firstSeen.set(visitor, day)
    } else if (seen !== day) {
      if (!returningByDay.has(day)) returningByDay.set(day, new Set())
      returningByDay.get(day)!.add(visitor)
    }

    if (row.action === 'post_cta_click') {
      const meta = safeMeta(row.meta)
      const key = typeof meta.cta === 'string' ? meta.cta : 'unknown'
      cta.set(key, (cta.get(key) ?? 0) + 1)
    }

    if (row.action === 'performance_metric') {
      const meta = safeMeta(row.meta)
      const value = typeof meta.value === 'number' ? meta.value : 0
      const metric = typeof meta.metric === 'string' ? meta.metric : 'LCP'
      const band =
        metric === 'LCP'
          ? value <= 2500
            ? 'good'
            : value <= 4000
              ? 'needs-improvement'
              : 'poor'
          : metric === 'CLS'
            ? value <= 0.1
              ? 'good'
              : value <= 0.25
                ? 'needs-improvement'
                : 'poor'
            : value <= 200
              ? 'good'
              : value <= 500
                ? 'needs-improvement'
                : 'poor'
      perfBands.set(band, (perfBands.get(band) ?? 0) + 1)
    }
  }

  const days = [...perDayVisitors.keys()].sort()
  const cohorts = days.slice(-14).map((day) => ({
    day,
    newVisitors: [...(perDayVisitors.get(day) ?? new Set())].filter((visitor) => firstSeen.get(visitor) === day).length,
    returningVisitors: (returningByDay.get(day) ?? new Set()).size,
  }))

  const totalUsers = firstSeen.size || 1
  const returningUsers = new Set([...returningByDay.values()].flatMap((set) => [...set])).size
  const retentionRatePercent = Number(((returningUsers / totalUsers) * 100).toFixed(2))

  return {
    cohorts,
    ctrByCta: [...cta.entries()]
      .map(([ctaName, clicks]) => ({ cta: ctaName, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 8),
    performanceBands: [...perfBands.entries()].map(([band, count]) => ({ band, count })),
    retentionRatePercent,
  }
}
