import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BlogPostClient from '@/components/blog/BlogPostClient'
import NewsletterCapture from '@/components/blog/NewsletterCapture'
import TrackedLink from '@/components/blog/TrackedLink'
import TrackedExternalLink from '@/components/blog/TrackedExternalLink'
import { getPublishedPostBySlug, listPublishedSlugs, listRelatedPosts } from '@/lib/blog-store'
import { estimateReadingMinutes, parseMarkdown } from '@/lib/markdown'
import { listApprovedCommentsBySlug } from '@/lib/blog-comments-store'
import { absoluteUrl } from '@/lib/site-config'
import { getDirectoryMemberById } from '@/lib/member-directory-store'
import FunnelTracker from '@/components/blog/FunnelTracker'

export const revalidate = 120

type PostPageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await listPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) {
    return { title: 'Post not found | KIWI BIT' }
  }
  const canonical = absoluteUrl(`/blog/${post.slug}`)
  const ogImage = absoluteUrl(`/api/og/post/${post.slug}`)
  return {
    title: `${post.title} | KIWI BIT Blog`,
    description: post.excerpt,
    keywords: [...post.tags, ...post.categories, 'security', 'engineering'],
    alternates: {
      canonical,
      languages: {
        'pt-BR': absoluteUrl(`/blog/${post.slug}`),
        en: absoluteUrl(`/en/blog/${post.slug}`),
      },
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
    },
  }
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()

  const author = await getDirectoryMemberById(post.authorId)
  const markdown = post.publishedContent ?? post.draftContent
  const { toc, blocks } = parseMarkdown(markdown)
  const readingMinutes = estimateReadingMinutes(markdown)
  const related = await listRelatedPosts(post.slug, 3)
  const comments = await listApprovedCommentsBySlug(post.slug)
  const canonical = absoluteUrl(`/blog/${post.slug}`)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blog', item: absoluteUrl('/blog') },
      { '@type': 'ListItem', position: 2, name: post.title, item: canonical },
    ],
  }
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    keywords: post.tags.join(', '),
    articleSection: post.categories,
    image: [post.coverImage],
    datePublished: post.publishedAt ?? post.updatedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: author?.name ?? post.authorId },
    publisher: { '@type': 'Organization', name: 'KIWI BIT' },
    mainEntityOfPage: canonical,
  }

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 pb-16 pt-28 text-[var(--text-main)]">
      <FunnelTracker slug={post.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">On this page</p>
          {toc.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">No heading map available.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? 'pl-3 text-[var(--text-soft)]' : ''}>
                  <a href={`#${item.id}`} className="hover:text-[var(--text-main)]">
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <article>
          <header>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {post.tags.map((tag) => (
                <TrackedLink key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} tag={tag} slug={post.slug} className="rounded border border-[var(--surface-border)] px-2 py-1 text-xs">
                  #{tag}
                </TrackedLink>
              ))}
            </div>
            <h1 className="text-4xl font-semibold md:text-5xl">{post.title}</h1>
            <p className="mt-3 text-sm text-[var(--text-soft)]">{post.excerpt}</p>
            <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span>{readingMinutes} min read</span>
              <span>{new Date(post.publishedAt ?? post.updatedAt).toLocaleDateString('en-US')}</span>
              <span>Author: {author?.name ?? post.authorId}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <TrackedExternalLink href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`} slug={post.slug} cta="share_linkedin" eventType="share_click" className="rounded border border-[var(--surface-border)] px-3 py-1 text-xs">
                Share LinkedIn
              </TrackedExternalLink>
              <TrackedExternalLink href={`https://x.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(post.title)}`} slug={post.slug} cta="share_x" eventType="share_click" className="rounded border border-[var(--surface-border)] px-3 py-1 text-xs">
                Share X
              </TrackedExternalLink>
            </div>
          </header>

          <Image
            src={post.coverImage}
            alt={post.title}
            width={1200}
            height={620}
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="mt-8 h-auto w-full rounded-2xl object-cover"
          />

          <div className="mt-10 max-w-3xl space-y-6 text-[17px] leading-8 text-[var(--text-soft)]">
            {blocks.map((block, index) => {
              if (block.type === 'h2') return <h2 key={`${block.id}-${index}`} id={block.id} className="pt-6 text-3xl font-semibold leading-tight text-[var(--text-main)]">{block.text}</h2>
              if (block.type === 'h3') return <h3 key={`${block.id}-${index}`} id={block.id} className="pt-3 text-2xl font-semibold leading-tight text-[var(--text-main)]">{block.text}</h3>
              if (block.type === 'ul') {
                return (
                  <ul key={`ul-${index}`} className="list-inside list-disc space-y-2">
                    {block.items.map((item) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )
              }
              return <p key={`p-${index}`}>{block.text}</p>
            })}
          </div>

          {author ? (
            <div className="mt-12 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Author</p>
              <div className="mt-2 flex items-center gap-3">
                <Image src={author.avatar_url} alt={author.name} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                <div>
                  <p className="font-semibold">{author.name}</p>
                  <p className="text-sm text-[var(--text-soft)]">{author.role}</p>
                  <Link href={`/blog/author/${author.id}`} className="text-xs text-[var(--text-muted)] underline">
                    More posts by author
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <BlogPostClient
            slug={post.slug}
            initialComments={comments.map((comment) => ({
              id: comment.id,
              name: comment.name,
              message: comment.message,
              createdAt: comment.createdAt,
            }))}
          />

          <div className="mt-14">
            <NewsletterCapture />
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-semibold">Related Posts</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.slug} href={`/blog/${item.slug}`} className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs text-[var(--text-soft)]">{item.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}
