import { NextResponse } from 'next/server'
import { appendAuditLog } from '@/lib/audit-log'
import { getPublishedMemberById } from '@/lib/member-store'
import { contactSchema } from '@/lib/validation'
import { enforceRateLimit, getClientIp } from '@/lib/security'

type ContactPayload = {
  memberId?: string
  name?: string
  email?: string
  message?: string
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rate = await enforceRateLimit(`contact:${ip}`, 20)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const payload = (await request.json()) as ContactPayload
  const parsed = contactSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const targetMember = await getPublishedMemberById(parsed.data.memberId)
  if (!targetMember) {
    return NextResponse.json({ error: 'Invalid member' }, { status: 400 })
  }
  await appendAuditLog({
    at: new Date().toISOString(),
    actorMemberId: 'visitor',
    actorRole: 'public',
    targetMemberId: parsed.data.memberId,
    action: 'contact_submit',
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    meta: { email: parsed.data.email },
  })

  return NextResponse.json({
    ok: true,
    forwardedTo: targetMember.contactEmail,
  })
}
