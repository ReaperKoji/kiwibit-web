import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './cyberpunk.css'
import { absoluteUrl, SITE_URL } from '@/lib/site-config'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KIWI BIT',
    template: '%s | KIWI BIT',
  },
  description: 'Security engineering articles, portfolio intelligence, and practical playbooks from the KIWI BIT team.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'KIWI BIT',
    description: 'Security engineering articles, portfolio intelligence, and practical playbooks from the KIWI BIT team.',
    type: 'website',
    url: absoluteUrl('/'),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KIWI BIT',
    description: 'Security engineering articles, portfolio intelligence, and practical playbooks from the KIWI BIT team.',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
