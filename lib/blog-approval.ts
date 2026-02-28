import { promises as fs } from 'fs'
import path from 'path'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl')

type ApprovalEvent = {
  actorMemberId: string
  action: string
  meta?: Record<string, unknown> | null
}

async function readApprovalsForSlug(slug: string): Promise<ApprovalEvent[]> {
  if (isDatabaseEnabled()) {
    const rows = await prisma.auditEvent.findMany({
      where: {
        action: { in: ['blog_post_approved', 'blog_post_publish_blocked'] },
      },
      orderBy: { at: 'desc' },
      take: 1000,
      select: { actorMemberId: true, action: true, meta: true },
    })
    return rows
      .map((row) => {
        const meta =
          row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
            ? (row.meta as Record<string, unknown>)
            : null
        return {
          actorMemberId: row.actorMemberId,
          action: row.action,
          meta,
        } satisfies ApprovalEvent
      })
      .filter((row) => row.meta?.slug === slug)
  }
  if (isDatabaseStrict()) {
    return []
  }
  try {
    const raw = await fs.readFile(AUDIT_LOG_PATH, 'utf8')
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
    const events: ApprovalEvent[] = []
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as {
          actorMemberId?: string
          action?: string
          meta?: Record<string, unknown>
        }
        if (!parsed.action) continue
        if (parsed.action !== 'blog_post_approved' && parsed.action !== 'blog_post_publish_blocked') continue
        if (parsed.meta?.slug !== slug) continue
        events.push({
          actorMemberId: parsed.actorMemberId ?? 'unknown',
          action: parsed.action,
          meta: parsed.meta ?? null,
        })
      } catch {
        // noop
      }
    }
    return events
  } catch {
    return []
  }
}

export async function getUniqueApproversForSlug(slug: string) {
  const events = await readApprovalsForSlug(slug)
  const approvers = new Set<string>()
  for (const event of events) {
    if (event.action === 'blog_post_approved') {
      approvers.add(event.actorMemberId)
    }
  }
  return [...approvers]
}
