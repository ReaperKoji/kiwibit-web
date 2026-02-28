import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { listDirectoryMembers } from '@/lib/member-directory-store'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

const getCachedMembers = unstable_cache(
  async () => listDirectoryMembers(),
  ['members-directory-list'],
  { tags: ['members-directory'], revalidate: 120 }
)

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const members = await getCachedMembers()
    const response = NextResponse.json({ members })
    response.headers.set('cache-control', 'public, s-maxage=120, stale-while-revalidate=600')
    return withRequestId(ctx, response)
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load members')
  }
}
