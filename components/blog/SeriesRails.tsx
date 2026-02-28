import Link from 'next/link'
import { CONTENT_SERIES } from '@/data/content-series'
import { listPublishedPosts } from '@/lib/blog-store'

export default async function SeriesRails() {
  const listing = await listPublishedPosts({ page: 1, pageSize: 60 })
  const posts = listing.items

  const mapped = CONTENT_SERIES.map((series) => {
    const related = posts
      .filter((post) => {
        const hay = `${post.tags.join(' ')} ${post.categories.join(' ')} ${post.title} ${post.excerpt}`.toLowerCase()
        return series.tags.some((tag) => hay.includes(tag.toLowerCase()))
      })
      .slice(0, 4)
    return { ...series, related }
  })

  return (
    <section className="mb-10 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Learning Trails</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {mapped.map((series) => (
          <article key={series.id} className="rounded border border-[var(--surface-border)] p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{series.difficulty}</p>
            <h3 className="mt-1 text-lg font-semibold">{series.name}</h3>
            <p className="mt-2 text-xs text-[var(--text-soft)]">{series.description}</p>
            <ul className="mt-3 space-y-1 text-xs">
              {series.related.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="hover:text-[var(--text-main)]">
                    {post.title}
                  </Link>
                </li>
              ))}
              {series.related.length === 0 ? <li className="text-[var(--text-muted)]">New posts coming soon.</li> : null}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
