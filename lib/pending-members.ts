import { isDatabaseEnabled, prisma } from '@/lib/prisma'

export async function listPendingMembers() {
  if (!isDatabaseEnabled()) return []

  const rows = await prisma.memberProfileState.findMany({
    where: { moderationStatus: 'pending_review' },
    select: { memberId: true, pendingAt: true },
    orderBy: { pendingAt: 'asc' },
  })

  return rows.map((row) => ({
    memberId: row.memberId,
    pendingAt: row.pendingAt?.toISOString() ?? null,
  }))
}
