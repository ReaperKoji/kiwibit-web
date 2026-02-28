import type { Metadata } from 'next'
import BlogPage from '@/app/blog/page'
import { absoluteUrl } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Blog | KIWI BIT',
  description: 'Security engineering articles, incident response notes and architecture research.',
  alternates: {
    canonical: absoluteUrl('/en/blog'),
    languages: {
      en: absoluteUrl('/en/blog'),
      'pt-BR': absoluteUrl('/blog'),
    },
  },
}

export default BlogPage
