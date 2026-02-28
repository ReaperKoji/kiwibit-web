import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionTokenPersisted, getSessionFromCookiesAsync, SESSION_COOKIE, sessionCookieOptions, shouldRotateSession } from '@/lib/session'
import { createCsrfToken, csrfCookieOptions, getCsrfCookieName } from '@/lib/security'
import { createUploadToken } from '@/lib/upload-signature'

export async function GET() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const currentCsrf = cookieStore.get(getCsrfCookieName())?.value
  const shouldRotate = shouldRotateSession(session) || !currentCsrf
  const csrfToken = shouldRotate ? createCsrfToken(session.memberId) : currentCsrf

  const response = NextResponse.json({
    authenticated: true,
    memberId: session.memberId,
    email: session.email,
    role: session.role,
    csrfToken,
    uploadTokens: {
      memberAvatar: createUploadToken(session.memberId, 'member-avatar', 60 * 10),
      adminAvatar:
        session.role === 'admin' || session.role === 'member_manager'
          ? createUploadToken(session.memberId, 'admin-avatar', 60 * 10)
          : null,
      adminMedia:
        session.role === 'admin' || session.role === 'editor'
          ? createUploadToken(session.memberId, 'admin-media', 60 * 10)
          : null,
    },
  })

  if (shouldRotate) {
    const rotated = await createSessionTokenPersisted(session.memberId, session.email, session.role)
    response.cookies.set(SESSION_COOKIE, rotated, sessionCookieOptions())
    response.cookies.set(getCsrfCookieName(), csrfToken, csrfCookieOptions())
  }

  return response
}
