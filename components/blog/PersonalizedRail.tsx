'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type RecommendedPost = {
  slug: string
  title: string
  excerpt: string
}

function getVisitorId() {
  const key = 'kb_visitor_id'
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(key, created)
  return created
}

export default function PersonalizedRail() {
  const [posts, setPosts] = useState<RecommendedPost[]>([])

  useEffect(() => {
    const visitorId = getVisitorId()
    void fetch(`/api/blog/recommendations?visitorId=${encodeURIComponent(visitorId)}`)
      .then((response) => response.json())
      .then((data: { posts?: RecommendedPost[] }) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]))
  }, [])

  if (posts.length === 0) return null

  return (
    <section className="mb-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Personalized For You</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {posts.slice(0, 3).map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="rounded border border-[var(--surface-border)] p-3 text-sm">
            <p className="font-semibold">{post.title}</p>
            <p className="mt-1 text-xs text-[var(--text-soft)]">{post.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
