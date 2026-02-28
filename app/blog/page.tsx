import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listPublishedPosts, listUniqueTagsAndCategories } from '@/lib/blog-store'
import NewsletterCapture from '@/components/blog/NewsletterCapture'
import TrackedLink from '@/components/blog/TrackedLink'
import { BLOG_EDITORIAL_CALENDAR } from '@/data/blog-editorial'
import { PILLAR_TOPICS } from '@/data/pillar-topics'
import { absoluteUrl } from '@/lib/site-config'
import { estimateReadingMinutes } from '@/lib/markdown'
import SemanticSearchPanel from '@/components/blog/SemanticSearchPanel'
import PersonalizedRail from '@/components/blog/PersonalizedRail'
import SeriesRails from '@/components/blog/SeriesRails'
import ActivityFeedRail from '@/components/blog/ActivityFeedRail'
import FunnelTracker from '@/components/blog/FunnelTracker'

export const revalidate = 120

type BlogPageProps = {
  searchParams: Promise<{
    q?: string
    tag?: string
    category?: string
    page?: string
  }>
}

export const metadata: Metadata = {
  title: 'Blog | KIWI BIT',
  description: 'Security engineering articles, incident response notes and architecture research.',
  keywords: ['security engineering', 'incident response', 'cybersecurity', 'architecture', 'kiwi bit'],
  alternates: {
    canonical: absoluteUrl('/blog'),
    languages: {
      'pt-BR': absoluteUrl('/blog'),
      en: absoluteUrl('/en/blog'),
    },
  },
  openGraph: {
    title: 'Blog | KIWI BIT',
    description: 'Security engineering articles, incident response notes and architecture research.',
    type: 'website',
    url: absoluteUrl('/blog'),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | KIWI BIT',
    description: 'Security engineering articles, incident response notes and architecture research.',
  },
}

function pageHref(params: { q?: string; tag?: string; category?: string; page: number }) {
  const query = new URLSearchParams()
  if (params.q) query.set('q', params.q)
  if (params.tag) query.set('tag', params.tag)
  if (params.category) query.set('category', params.category)
  query.set('page', String(params.page))
  return `/blog?${query.toString()}`
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const page = Number(params.page ?? '1')
  const listing = await listPublishedPosts({
    q: params.q,
    tag: params.tag,
    category: params.category,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 9,
  })
  const { tags, categories } = await listUniqueTagsAndCategories()

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 pb-16 pt-28 text-[var(--text-main)]">
      <FunnelTracker />
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Research Logs</p>
          <h1 className="mt-3 text-5xl font-semibold">KIWI BIT Blog</h1>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-soft)]">Draft-to-publish workflow, technical analysis, and practical security playbooks.</p>
          <div className="mt-3 flex gap-2 text-xs uppercase tracking-[0.12em]">
            <Link href="/blog" className="rounded border border-[var(--surface-border)] px-2 py-1">PT-BR</Link>
            <Link href="/en/blog" className="rounded border border-[var(--surface-border)] px-2 py-1">EN</Link>
          </div>
        </header>

        <form action="/blog" className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search posts, tags or categories..."
            className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded border border-[var(--surface-border)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
            Search
          </button>
        </form>

        <SemanticSearchPanel />
        <PersonalizedRail />
        <ActivityFeedRail />
        <SeriesRails />
        <section className="mb-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Pillar Pages</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PILLAR_TOPICS.map((topic) => (
              <Link key={topic} href={`/blog/pillars/${topic}`} className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.12em]">
                {topic}
              </Link>
            ))}
          </div>
        </section>

        {listing.featured ? (
          <article className="mb-10 overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)]">
            <div className="grid gap-0 md:grid-cols-2">
              <Image src={listing.featured.coverImage} alt={listing.featured.title} width={900} height={500} className="h-full w-full object-cover" />
              <div className="p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Featured</p>
                <h2 className="mt-3 text-3xl font-semibold">{listing.featured.title}</h2>
                <p className="mt-3 text-sm text-[var(--text-soft)]">{listing.featured.excerpt}</p>
                <Link href={`/blog/${listing.featured.slug}`} className="mt-6 inline-block rounded border border-[var(--text-main)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
                  Read article
                </Link>
              </div>
            </div>
          </article>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TrackedLink
              key={tag}
              href={pageHref({ q: params.q, tag, category: params.category, page: 1 })}
              tag={tag}
              className={`rounded border px-3 py-1 text-xs ${params.tag === tag ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-[var(--surface-border)]'}`}
            >
              #{tag}
            </TrackedLink>
          ))}
          {categories.map((category) => (
            <Link
              key={category}
              href={pageHref({ q: params.q, tag: params.tag, category, page: 1 })}
              className={`rounded border px-3 py-1 text-xs ${params.category === category ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-[var(--surface-border)]'}`}
            >
              {category}
            </Link>
          ))}
          {(params.tag || params.category || params.q) && (
            <Link href="/blog" className="rounded border border-[var(--surface-border)] px-3 py-1 text-xs text-[var(--text-muted)]">
              Clear filters
            </Link>
          )}
        </div>

        {listing.items.length === 0 ? (
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 text-center">
            <p className="text-sm text-[var(--text-soft)]">No posts found with the current filters.</p>
            <Link href="/blog" className="mt-4 inline-block rounded border border-[var(--surface-border)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
              Show all posts
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listing.items.map((post) => (
              <article key={post.slug} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
                <Image
                  src={post.coverImage}
                  alt={post.title}
                  width={600}
                  height={350}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="h-44 w-full rounded object-cover"
                />
                <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {new Date(post.publishedAt ?? post.updatedAt).toLocaleDateString('en-US')} · {estimateReadingMinutes(post.publishedContent ?? post.draftContent)} min read
                </p>
                <h3 className="mt-2 text-xl font-semibold">{post.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-soft)]">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="mt-4 inline-block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  View post
                </Link>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Link href={pageHref({ q: params.q, tag: params.tag, category: params.category, page: Math.max(1, listing.page - 1) })} className="text-xs uppercase tracking-[0.14em]">
            Previous
          </Link>
          <span className="text-xs text-[var(--text-muted)]">
            Page {listing.page} / {listing.totalPages}
          </span>
          <Link href={pageHref({ q: params.q, tag: params.tag, category: params.category, page: Math.min(listing.totalPages, listing.page + 1) })} className="text-xs uppercase tracking-[0.14em]">
            Next
          </Link>
        </div>

        <div className="mt-10">
          <NewsletterCapture />
        </div>

        <section className="mt-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Editorial Roadmap</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {BLOG_EDITORIAL_CALENDAR.map((item) => (
              <article key={item.period} className="rounded border border-[var(--surface-border)] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{item.period}</p>
                <h3 className="mt-1 text-sm font-semibold">{item.theme}</h3>
                <p className="mt-1 text-xs text-[var(--text-soft)]">{item.focus}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
