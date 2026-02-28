import { NextResponse } from 'next/server'
import { z } from 'zod'
import { appendAuditLog } from '@/lib/audit-log'
import { enforceRateLimit, getClientIp } from '@/lib/security'

const trackSchema = z.object({
  type: z.enum(['cta_click', 'section_view', 'profile_dwell']),
  memberId: z.string().min(1),
  section: z.string().optional(),
  ms: z.number().int().nonnegative().optional(),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`track:${ip}`, 120)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = trackSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await appendAuditLog({
    at: new Date().toISOString(),
    actorMemberId: 'visitor',
    actorRole: 'public',
    targetMemberId: parsed.data.memberId,
    action: parsed.data.type,
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    meta: {
      section: parsed.data.section,
      ms: parsed.data.ms,
    },
  })

  return NextResponse.json({ ok: true })
}
