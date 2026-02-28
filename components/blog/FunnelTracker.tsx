'use client'

import { useEffect } from 'react'

function getVisitorId() {
  if (typeof window === 'undefined') return 'visitor'
  const key = 'kb_visitor_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(key, created)
  return created
}

type Props = {
  slug?: string
}

export default function FunnelTracker({ slug }: Props) {
  useEffect(() => {
    void fetch('/api/blog/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'page_visit',
        slug,
        visitorId: getVisitorId(),
      }),
    })
  }, [slug])
  return null
}
