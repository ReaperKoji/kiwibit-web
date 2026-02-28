import { NextResponse } from 'next/server'
import { listPublishedPosts } from '@/lib/blog-store'
import { listDirectoryMembers } from '@/lib/member-directory-store'
import { MEMBER_GITHUB_USERNAMES } from '@/data/member-github'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

type FeedItem = {
  type: 'post' | 'github'
  at: string
  title: string
  url: string
  actor: string
}

async function fetchGithubEvents(username: string): Promise<FeedItem[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'kiwibit-activity-feed',
  }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=4`, {
      headers,
      next: { revalidate: 1800 },
    })
    if (!response.ok) return []
    const raw = (await response.json()) as Array<{ type?: string; created_at?: string; repo?: { name?: string }; actor?: { login?: string } }>
    return raw
      .filter((item) => item.type && item.repo?.name && item.created_at)
      .slice(0, 3)
      .map((item) => ({
        type: 'github',
        at: item.created_at as string,
        title: `${item.type} on ${item.repo?.name}`,
        url: `https://github.com/${item.repo?.name}`,
        actor: item.actor?.login ?? username,
      }))
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const [posts, members] = await Promise.all([listPublishedPosts({ page: 1, pageSize: 10 }), listDirectoryMembers()])
    const postItems: FeedItem[] = posts.items.slice(0, 6).map((post) => ({
      type: 'post',
      at: post.publishedAt ?? post.updatedAt,
      title: `Published: ${post.title}`,
      url: `/blog/${post.slug}`,
      actor: post.authorId,
    }))

    const githubUsernames = members
      .map((member) => MEMBER_GITHUB_USERNAMES[member.id])
      .filter((value): value is string => typeof value === 'string')
      .slice(0, 4)

    const githubItemsRaw = await Promise.all(githubUsernames.map((username) => fetchGithubEvents(username)))
    const githubItems = githubItemsRaw.flat()

    const items = [...postItems, ...githubItems].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 20)
    return withRequestId(ctx, NextResponse.json({ items }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load activity feed')
  }
}
