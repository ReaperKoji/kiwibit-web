import type { MetadataRoute } from 'next'
import { MEMBER_IDS } from '@/data/members'
import { listPublishedSlugs } from '@/lib/blog-store'
import { absoluteUrl } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogSlugs = await listPublishedSlugs()
  const blogEntries = blogSlugs.map((slug) => ({
    url: absoluteUrl(`/blog/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  const memberEntries = MEMBER_IDS.map((slug) => ({
    url: absoluteUrl(`/member/${slug}`),
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
  return [
    { url: absoluteUrl('/'), lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/blog'), lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/team'), lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...blogEntries,
    ...memberEntries,
  ]
}
