'use client'

import type { ReactNode } from 'react'

type TrackedExternalLinkProps = {
  href: string
  slug: string
  cta?: string
  eventType?: 'post_cta_click' | 'share_click'
  className?: string
  children: ReactNode
}

export default function TrackedExternalLink({ href, slug, cta, eventType = 'share_click', className, children }: TrackedExternalLinkProps) {
  const visitorId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('kb_visitor_id') ?? 'visitor'
      : 'visitor'
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        void fetch('/api/blog/analytics/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: eventType, slug, cta, visitorId }),
        })
      }}
    >
      {children}
    </a>
  )
}
