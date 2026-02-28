'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type TrackedLinkProps = {
  href: string
  tag: string
  slug?: string
  className?: string
  children: ReactNode
}

export default function TrackedLink({ href, tag, slug, className, children }: TrackedLinkProps) {
  const visitorId =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('kb_visitor_id') ?? 'visitor'
      : 'visitor'
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void fetch('/api/blog/analytics/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'tag_click', tag, slug, visitorId }),
        })
      }}
    >
      {children}
    </Link>
  )
}
