import { NextResponse } from 'next/server'
import { createSessionTokenPersisted, revokeSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session'
import { createCsrfToken, csrfCookieOptions, enforceRateLimit, getClientIp, getCsrfCookieName } from '@/lib/security'
import { appendAuditLog } from '@/lib/audit-log'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'
import { getAccessRoleForMember, getDirectoryMemberById } from '@/lib/member-directory-store'
import { verifyPassword, hashPassword } from '@/lib/password'
import { emitOpsAlert } from '@/lib/ops-alerts'
import { z } from 'zod'
import { isStrongPassword, passwordPolicyMessage } from '@/lib/password-policy'

type LoginPayload = {
  email?: string
  password?: string
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120).refine(isStrongPassword, passwordPolicyMessage()),
})

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const loginLimit = Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE ?? '30')
  const safeLimit = Number.isFinite(loginLimit) && loginLimit > 0 ? Math.floor(loginLimit) : 30
  const rate = await enforceRateLimit(`login:${ip}`, safeLimit)
  if (!rate.allowed) {
    await emitOpsAlert({
      event: 'login_rate_limited',
      severity: 'warning',
      message: 'Rate limit exceeded for login endpoint',
      context: { ip },
    })
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }

  const payload = (await request.json()) as LoginPayload
  const parsed = loginSchema.safeParse({
    email: payload.email?.trim() ?? '',
    password: payload.password ?? '',
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const email = parsed.data.email
  const password = parsed.data.password

  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: 'Authentication database unavailable' }, { status: 503 })
  }
  const account = await prisma.memberAccount.findUnique({
    where: { email: email.toLowerCase() },
    select: { memberId: true, email: true, password: true, role: true, isActive: true },
  })
  const passwordCheck = account ? await verifyPassword(password, account.password) : { ok: false, needsRehash: false }
  if (!account || !passwordCheck.ok) {
    await appendAuditLog({
      at: new Date().toISOString(),
      actorMemberId: 'unknown',
      actorRole: 'public',
      targetMemberId: 'unknown',
      action: 'login_failed',
      ip,
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      meta: { email },
    })
    await emitOpsAlert({
      event: 'login_failed',
      severity: 'warning',
      message: 'Invalid credentials',
      context: { ip, email },
    })
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!account.isActive) {
    return NextResponse.json({ error: 'Account disabled' }, { status: 403 })
  }

  const explicitRole =
    account.role === 'admin'
      ? 'admin'
      : account.role === 'editor'
        ? 'editor'
        : account.role === 'member_manager'
          ? 'member_manager'
          : 'member'
  const baseRole = explicitRole === 'admin' ? 'admin' : 'member'
  const directoryMember = await getDirectoryMemberById(account.memberId)
  if (directoryMember && !directoryMember.is_active) {
    return NextResponse.json({ error: 'Account disabled' }, { status: 403 })
  }
  const directoryRole = await getAccessRoleForMember(account.memberId, baseRole)
  const role = directoryRole === 'member' ? explicitRole : directoryRole

  if (passwordCheck.needsRehash) {
    await prisma.memberAccount.update({
      where: { email: account.email.toLowerCase() },
      data: { password: await hashPassword(password) },
    })
  }

  const existingToken = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1)
  if (existingToken) {
    await revokeSessionToken(existingToken)
  }

  const token = await createSessionTokenPersisted(account.memberId, account.email, role)
  const csrfToken = createCsrfToken(account.memberId)
  const response = NextResponse.json({ ok: true, memberId: account.memberId, role, csrfToken })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  response.cookies.set(getCsrfCookieName(), csrfToken, csrfCookieOptions())
  await appendAuditLog({
    at: new Date().toISOString(),
    actorMemberId: account.memberId,
    actorRole: role,
    targetMemberId: account.memberId,
    action: 'login_success',
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  })
  return response
}
