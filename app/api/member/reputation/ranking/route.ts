import { NextResponse } from 'next/server'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { listDirectoryMembers } from '@/lib/member-directory-store'
import { getMemberReputation } from '@/lib/member-reputation'
import { cacheGetJson, cacheSetJson } from '@/lib/distributed-cache'

type RankingItem = {
  memberId: string
  name: string
  score: number
  level: string
}

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const cached = await cacheGetJson<RankingItem[]>('member:reputation:ranking')
    if (cached) {
      return withRequestId(ctx, NextResponse.json({ items: cached, source: 'redis-cache' }))
    }

    const members = await listDirectoryMembers()
    const scores = await Promise.all(
      members.map(async (member) => {
        const rep = await getMemberReputation(member.id)
        return {
          memberId: member.id,
          name: member.name,
          score: rep.score,
          level: rep.level,
        }
      })
    )
    const ranked = scores.sort((a, b) => b.score - a.score).slice(0, 20)
    await cacheSetJson('member:reputation:ranking', ranked, 60 * 5)
    return withRequestId(ctx, NextResponse.json({ items: ranked, source: 'computed' }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load reputation ranking')
  }
}
