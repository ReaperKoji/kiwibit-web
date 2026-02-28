'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Comment = {
  id: string
  name: string
  message: string
  createdAt: string
}

type BlogPostClientProps = {
  slug: string
  initialComments: Comment[]
}

function getVisitorId() {
  if (typeof window === 'undefined') return 'visitor'
  const key = 'kb_visitor_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const created = `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
  window.localStorage.setItem(key, created)
  return created
}

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export default function BlogPostClient({ slug, initialComments }: BlogPostClientProps) {
  const [comments] = useState<Comment[]>(initialComments)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [enteredAt] = useState(() => Date.now())

  const commentCountLabel = useMemo(() => `${comments.length} comment${comments.length === 1 ? '' : 's'}`, [comments.length])

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      const depth = total > 0 ? Math.round((window.scrollY / total) * 100) : 0
      if (depth % 25 === 0 && depth > 0) {
        void fetch('/api/blog/analytics/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'scroll_depth', slug, depth, visitorId: getVisitorId() }),
        })
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [slug])

  useEffect(() => {
    const onLeave = () => {
      const ms = Date.now() - enteredAt
      navigator.sendBeacon('/api/blog/analytics/track', JSON.stringify({ type: 'post_dwell', slug, ms, visitorId: getVisitorId() }))
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [enteredAt, slug])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return
    const tracked = new Set<string>()

    const sendMetric = (metric: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB', value: number) => {
      const key = `${metric}:${Math.round(value)}`
      if (tracked.has(key)) return
      tracked.add(key)
      void fetch('/api/blog/analytics/performance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, metric, value, page: window.location.pathname, visitorId: getVisitorId() }),
      })
    }

    let lcpObserver: PerformanceObserver | null = null
    let paintObserver: PerformanceObserver | null = null

    try {
      lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const last = entries[entries.length - 1]
        if (last) sendMetric('LCP', last.startTime)
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      // Browser does not support this metric type.
    }

    try {
      paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') sendMetric('FCP', entry.startTime)
        }
      })
      paintObserver.observe({ type: 'paint', buffered: true })
    } catch {
      // Browser does not support this metric type.
    }

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      sendMetric('TTFB', nav.responseStart)
    }

    return () => {
      lcpObserver?.disconnect()
      paintObserver?.disconnect()
    }
  }, [slug])

  function trackCta(cta: string) {
    void fetch('/api/blog/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post_cta_click', slug, cta, visitorId: getVisitorId() }),
    })
  }

  async function submitComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    trackCta('comment_submit')
    setFeedback('')
    setIsSending(true)
    const response = await fetch('/api/blog/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug, name, email, message, visitorId: getVisitorId() }),
    })
    if (!response.ok) {
      setFeedback('Comment blocked or invalid. Please review your message.')
      setIsSending(false)
      return
    }
    setName('')
    setEmail('')
    setMessage('')
    setFeedback('Comment submitted for moderation.')
    setIsSending(false)
  }

  return (
    <section className="mt-16 space-y-10">
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{commentCountLabel}</p>
        <div className="mt-4 space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded border border-[var(--surface-border)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-sm">{comment.name}</strong>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-[var(--text-soft)]">{comment.message}</p>
            </article>
          ))}
        </div>
      </div>

      <form onSubmit={submitComment} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
        <h3 className="text-lg font-semibold">Leave a Comment</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Comment" required rows={4} className="mt-3 w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" disabled={isSending} className="rounded border border-[var(--text-main)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
            {isSending ? 'Sending...' : 'Submit'}
          </button>
          {feedback ? <p className="text-xs text-[var(--text-soft)]">{feedback}</p> : null}
        </div>
      </form>
    </section>
  )
}
