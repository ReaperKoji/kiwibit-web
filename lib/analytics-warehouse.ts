import { isDatabaseEnabled, prisma } from '@/lib/prisma'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function rollupAnalyticsDaily(days = 14) {
  if (!isDatabaseEnabled()) return { rolled: 0 }
  const rolledDays: string[] = []
  for (let i = 0; i < days; i += 1) {
    const dayDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dayStart = startOfDay(dayDate)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const events = await prisma.auditEvent.findMany({
      where: {
        at: { gte: dayStart, lt: dayEnd },
      },
      select: { action: true, actorMemberId: true },
    })
    const uniqueVisitors = new Set(events.map((e) => e.actorMemberId)).size
    const postReads = events.filter((e) => e.action === 'post_dwell').length
    const ctaClicks = events.filter((e) => e.action === 'post_cta_click').length
    const shares = events.filter((e) => e.action === 'share_click').length
    const newsletterStarts = events.filter((e) => e.action === 'newsletter_subscribe_pending').length
    const newsletterConfirms = events.filter((e) => e.action === 'newsletter_subscribe_confirmed').length

    await prisma.analyticsDaily.upsert({
      where: { day: dayStart },
      create: {
        day: dayStart,
        events: events.length,
        uniqueVisitors,
        postReads,
        ctaClicks,
        shares,
        newsletterStarts,
        newsletterConfirms,
      },
      update: {
        events: events.length,
        uniqueVisitors,
        postReads,
        ctaClicks,
        shares,
        newsletterStarts,
        newsletterConfirms,
      },
    })
    rolledDays.push(dayStart.toISOString().slice(0, 10))
  }
  return { rolled: rolledDays.length, days: rolledDays }
}

export async function listAnalyticsDaily(limit = 30) {
  if (!isDatabaseEnabled()) return []
  return prisma.analyticsDaily.findMany({
    orderBy: { day: 'desc' },
    take: limit,
  })
}
