'use client'

import { FormEvent, useState } from 'react'

function getVariant() {
  if (typeof window === 'undefined') return 'A' as const
  const id = window.localStorage.getItem('kb_visitor_id') ?? 'a'
  return id.charCodeAt(0) % 2 === 0 ? 'A' : 'B'
}

export default function NewsletterCapture() {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void fetch('/api/blog/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post_cta_click', cta: 'newsletter_subscribe' }),
    })
    setIsSending(true)
    setFeedback('')
    const response = await fetch('/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        segment: 'blog-security',
        source: window.location.pathname,
        variant: getVariant(),
      }),
    })
    const data = (await response.json()) as { confirmUrl?: string; error?: string }
    if (!response.ok) {
      setFeedback(data.error ?? 'Could not subscribe now.')
      setIsSending(false)
      return
    }
    setFeedback(`Check confirmation link: ${data.confirmUrl ?? ''}`)
    setEmail('')
    setIsSending(false)
  }

  return (
    <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
      <h3 className="text-xl font-semibold">Newsletter</h3>
      <p className="mt-2 text-sm text-[var(--text-soft)]">Get new intelligence posts with double opt-in confirmation.</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="flex-1 rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={isSending} className="rounded border border-[var(--text-main)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
          {isSending ? 'Sending...' : 'Subscribe'}
        </button>
      </form>
      {feedback ? <p className="mt-2 text-xs text-[var(--text-soft)]">{feedback}</p> : null}
    </section>
  )
}
