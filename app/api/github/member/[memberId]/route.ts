import { NextResponse } from 'next/server'
import { MEMBER_GITHUB_USERNAMES } from '@/data/member-github'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

type GithubRepo = {
  name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  pushed_at: string
  fork: boolean
}

type GithubUser = {
  login: string
  html_url: string
  avatar_url: string
  bio: string | null
  followers: number
  following: number
  public_repos: number
}

type GithubMemberRepo = {
  name: string
  htmlUrl: string
  description: string
  language: string
  stars: number
  pushedAt: string
}

type GithubCacheEntry = {
  profile: {
    username: string
    profileUrl: string
    avatarUrl: string
    bio: string
    followers: number
    following: number
    publicRepos: number
  } | null
  repos: GithubMemberRepo[]
  expiresAt: number
  staleUntil: number
}

const githubRepoCache = new Map<string, GithubCacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000
const STALE_TTL_MS = 60 * 60 * 1000
const GITHUB_TIMEOUT_MS = 7000

function isFetchTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false
  if (error.name === 'TimeoutError') return true
  if (error.message.toLowerCase().includes('timedout')) return true
  return false
}

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = createApiRequestContext(request)

  try {
    const { memberId } = await params
    const username = MEMBER_GITHUB_USERNAMES[memberId]

    if (!username) {
      return withRequestId(ctx, NextResponse.json({ profile: null, repos: [] }))
    }

    const cacheKey = `${memberId}:${username}`
    const now = Date.now()
    const cached = githubRepoCache.get(cacheKey)

    if (cached && cached.expiresAt > now) {
      return withRequestId(ctx, NextResponse.json({ profile: cached.profile, repos: cached.repos, source: 'cache' }))
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kiwibit-member-github',
    }

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const abortSignal = AbortSignal.timeout(GITHUB_TIMEOUT_MS)
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers,
        signal: abortSignal,
        next: { revalidate: 1800 },
      }),
      fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6&type=owner`,
      {
        headers,
        signal: abortSignal,
        next: { revalidate: 1800 },
      }
    ),
    ])

    if (!reposResponse.ok || !profileResponse.ok) {
      if (cached && cached.staleUntil > now) {
        return withRequestId(ctx, NextResponse.json({ profile: cached.profile, repos: cached.repos, source: 'stale-cache' }))
      }
      return withRequestId(ctx, NextResponse.json({ profile: null, repos: [] }))
    }

    const profileRaw = (await profileResponse.json()) as GithubUser
    const repos = (await reposResponse.json()) as GithubRepo[]

    const profile = {
      username: profileRaw.login,
      profileUrl: profileRaw.html_url,
      avatarUrl: profileRaw.avatar_url,
      bio: profileRaw.bio ?? 'GitHub profile connected.',
      followers: profileRaw.followers,
      following: profileRaw.following,
      publicRepos: profileRaw.public_repos,
    }

    const normalized = repos
      .filter((repo) => !repo.fork)
      .slice(0, 6)
      .map((repo) => ({
        name: repo.name,
        htmlUrl: repo.html_url,
        description: repo.description ?? 'No description provided.',
        language: repo.language ?? 'Unknown',
        stars: repo.stargazers_count,
        pushedAt: repo.pushed_at,
      }))

    const totalStars = normalized.reduce((sum, repo) => sum + repo.stars, 0)

    githubRepoCache.set(cacheKey, {
      profile,
      repos: normalized,
      expiresAt: now + CACHE_TTL_MS,
      staleUntil: now + STALE_TTL_MS,
    })

    return withRequestId(
      ctx,
      NextResponse.json({
        profile,
        repos: normalized,
        metrics: {
          totalStars,
          totalRepos: normalized.length,
        },
        source: 'github',
      })
    )
  } catch (error) {
    if (isFetchTimeoutError(error)) {
      const { memberId } = await params
      const username = MEMBER_GITHUB_USERNAMES[memberId]
      const cacheKey = `${memberId}:${username}`
      const cached = githubRepoCache.get(cacheKey)
      if (cached && cached.staleUntil > Date.now()) {
        return withRequestId(ctx, NextResponse.json({ profile: cached.profile, repos: cached.repos, source: 'stale-cache-timeout' }))
      }
      return withRequestId(ctx, NextResponse.json({ profile: null, repos: [], source: 'timeout' }))
    }
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Unable to load GitHub repositories')
  }
}
