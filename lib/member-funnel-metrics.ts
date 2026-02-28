import { promises as fs } from 'fs'
import path from 'path'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

type MetricResult = {
  created: number
  updated: number
  deleted: number
  validationErrors: number
  avgDurationMs: number
  errorRatePercent: number
}

export type FunnelSeriesPoint = {
  date: string
  created: number
  updated: number
  deleted: number
  validationErrors: number
}

type AuditLike = {
  action: string
  meta?: Record<string, unknown>
  at: string
}

const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl')

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function toMetrics(events: AuditLike[]): MetricResult {
  let created = 0
  let updated = 0
  let deleted = 0
  let validationErrors = 0
  let timedCount = 0
  let durationTotal = 0

  for (const event of events) {
    if (event.action === 'member_created') created += 1
    if (event.action === 'member_updated') updated += 1
    if (event.action === 'member_deleted') deleted += 1
    if (event.action === 'member_validation_failed') validationErrors += 1

    const duration = event.meta?.durationMs
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      timedCount += 1
      durationTotal += duration
    }
  }
  const totalWrites = created + updated + deleted
  const errorRatePercent = totalWrites > 0 ? (validationErrors / totalWrites) * 100 : 0
  return {
    created,
    updated,
    deleted,
    validationErrors,
    avgDurationMs: timedCount > 0 ? Number((durationTotal / timedCount).toFixed(1)) : 0,
    errorRatePercent: Number(errorRatePercent.toFixed(1)),
  }
}

function toSeries(events: AuditLike[], days: number): FunnelSeriesPoint[] {
  const now = new Date()
  const buckets = new Map<string, FunnelSeriesPoint>()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, created: 0, updated: 0, deleted: 0, validationErrors: 0 })
  }
  for (const event of events) {
    const key = new Date(event.at).toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (event.action === 'member_created') bucket.created += 1
    if (event.action === 'member_updated') bucket.updated += 1
    if (event.action === 'member_deleted') bucket.deleted += 1
    if (event.action === 'member_validation_failed') bucket.validationErrors += 1
  }
  return Array.from(buckets.values())
}

export function seriesToCsv(series: FunnelSeriesPoint[]) {
  const header = 'date,created,updated,deleted,validation_errors'
  const rows = series.map((point) => `${point.date},${point.created},${point.updated},${point.deleted},${point.validationErrors}`)
  return [header, ...rows].join('\n')
}

export async function getMemberFunnelMetrics(): Promise<MetricResult> {
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  if (isDatabaseEnabled()) {
    const rows = await prisma.auditEvent.findMany({
      where: {
        at: { gte: sevenDaysAgo },
        action: { in: ['member_created', 'member_updated', 'member_deleted', 'member_validation_failed'] },
      },
      select: { action: true, at: true, meta: true },
      orderBy: { at: 'desc' },
    })
    return toMetrics(
      rows.map((row) => ({
        action: row.action,
        at: row.at.toISOString(),
        meta: asRecord(row.meta),
      }))
    )
  }

  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }

  try {
    const raw = await fs.readFile(AUDIT_LOG_PATH, 'utf8')
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
    const parsed: AuditLike[] = []
    for (const line of lines) {
      try {
        const row = JSON.parse(line) as { action?: string; at?: string; meta?: Record<string, unknown> }
        if (!row.action || !row.at) continue
        const atTime = new Date(row.at).getTime()
        if (!Number.isFinite(atTime) || atTime < sevenDaysAgo.getTime()) continue
        if (!['member_created', 'member_updated', 'member_deleted', 'member_validation_failed'].includes(row.action)) continue
        parsed.push({
          action: row.action,
          at: row.at,
          meta: asRecord(row.meta),
        })
      } catch {
        // Ignore malformed lines.
      }
    }
    return toMetrics(parsed)
  } catch {
    return {
      created: 0,
      updated: 0,
      deleted: 0,
      validationErrors: 0,
      avgDurationMs: 0,
      errorRatePercent: 0,
    }
  }
}

export async function getMemberFunnelSeries(days: 7 | 30): Promise<FunnelSeriesPoint[]> {
  const now = Date.now()
  const from = new Date(now - days * 24 * 60 * 60 * 1000)

  if (isDatabaseEnabled()) {
    const rows = await prisma.auditEvent.findMany({
      where: {
        at: { gte: from },
        action: { in: ['member_created', 'member_updated', 'member_deleted', 'member_validation_failed'] },
      },
      select: { action: true, at: true, meta: true },
      orderBy: { at: 'desc' },
    })
    return toSeries(
      rows.map((row) => ({
        action: row.action,
        at: row.at.toISOString(),
        meta: asRecord(row.meta),
      })),
      days
    )
  }

  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }

  try {
    const raw = await fs.readFile(AUDIT_LOG_PATH, 'utf8')
    const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
    const parsed: AuditLike[] = []
    for (const line of lines) {
      try {
        const row = JSON.parse(line) as { action?: string; at?: string; meta?: Record<string, unknown> }
        if (!row.action || !row.at) continue
        const at = new Date(row.at)
        if (!Number.isFinite(at.getTime()) || at.getTime() < from.getTime()) continue
        if (!['member_created', 'member_updated', 'member_deleted', 'member_validation_failed'].includes(row.action)) continue
        parsed.push({ action: row.action, at: row.at, meta: asRecord(row.meta) })
      } catch {
        // ignore malformed line
      }
    }
    return toSeries(parsed, days)
  } catch {
    return toSeries([], days)
  }
}
