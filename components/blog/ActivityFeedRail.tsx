'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type FeedItem = {
  type: 'post' | 'github'
  at: string
  title: string
  url: string
  actor: string
}

export default function ActivityFeedRail() {
  const [items, setItems] = useState<FeedItem[]>([])

  useEffect(() => {
    void fetch('/api/activity/feed')
      .then((response) => response.json())
      .then((data: { items?: FeedItem[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mb-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Live Activity Feed</p>
      <ul className="mt-3 space-y-2 text-xs">
        {items.slice(0, 8).map((item, index) => (
          <li key={`${item.url}-${index}`} className="rounded border border-[var(--surface-border)] p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{item.type}</p>
            {item.url.startsWith('http') ? (
              <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block hover:text-[var(--text-main)]">
                {item.title}
              </a>
            ) : (
              <Link href={item.url} className="mt-1 block hover:text-[var(--text-main)]">
                {item.title}
              </Link>
            )}
            <p className="mt-1 text-[10px] text-[var(--text-soft)]">{new Date(item.at).toLocaleString('en-US')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
