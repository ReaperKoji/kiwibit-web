import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PILLAR_COPY, PILLAR_TOPICS, type PillarTopic } from '@/data/pillar-topics'
import { listPublishedPosts } from '@/lib/blog-store'
import { absoluteUrl } from '@/lib/site-config'

type PageProps = {
  params: Promise<{ topic: string }>
}

export async function generateStaticParams() {
  return PILLAR_TOPICS.map((topic) => ({ topic }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { topic } = await params
  if (!PILLAR_TOPICS.includes(topic as PillarTopic)) {
    return { title: 'Pillar Not Found | KIWI BIT' }
  }
  const info = PILLAR_COPY[topic as PillarTopic]
  return {
    title: `${info.title} | KIWI BIT`,
    description: info.description,
    keywords: info.keywords,
    alternates: { canonical: absoluteUrl(`/blog/pillars/${topic}`) },
  }
}

export default async function PillarPage({ params }: PageProps) {
  const { topic } = await params
  if (!PILLAR_TOPICS.includes(topic as PillarTopic)) notFound()
  const info = PILLAR_COPY[topic as PillarTopic]
  const listing = await listPublishedPosts({ page: 1, pageSize: 80 })
  const related = listing.items
    .filter((post) => {
      const hay = `${post.title} ${post.excerpt} ${post.tags.join(' ')} ${post.categories.join(' ')}`.toLowerCase()
      return info.keywords.some((keyword) => hay.includes(keyword))
    })
    .slice(0, 24)

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24 text-[var(--text-main)]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Pillar Topic</p>
        <h1 className="mt-2 text-4xl font-semibold">{info.title}</h1>
        <p className="mt-3 text-sm text-[var(--text-soft)]">{info.description}</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {related.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
              <p className="font-semibold">{post.title}</p>
              <p className="mt-2 text-xs text-[var(--text-soft)]">{post.excerpt}</p>
            </Link>
          ))}
          {related.length === 0 ? <p className="text-sm text-[var(--text-soft)]">No cluster posts yet for this pillar.</p> : null}
        </div>
      </div>
    </main>
  )
}
