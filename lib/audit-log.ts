import { promises as fs } from 'fs'
import path from 'path'
import { Prisma } from '@prisma/client'
import { prisma, isDatabaseEnabled, isDatabaseStrict } from '@/lib/prisma'

const LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl')

type AuditEntry = {
  at: string
  actorMemberId: string
  actorRole: string
  targetMemberId: string
  action: string
  ip: string
  userAgent: string
  meta?: Record<string, unknown>
}

export async function appendAuditLog(entry: AuditEntry) {
  if (isDatabaseEnabled()) {
    await prisma.auditEvent.create({
      data: {
        at: new Date(entry.at),
        actorMemberId: entry.actorMemberId,
        actorRole: entry.actorRole,
        targetMemberId: entry.targetMemberId,
        action: entry.action,
        ip: entry.ip,
        userAgent: entry.userAgent,
        meta: (entry.meta ?? {}) as Prisma.InputJsonValue,
      },
    })
    return
  }
  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }

  const line = JSON.stringify(entry)
  await fs.appendFile(LOG_PATH, `${line}\n`, 'utf8')
}
