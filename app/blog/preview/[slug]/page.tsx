import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/blog-store'
import { verifyBlogPreviewToken } from '@/lib/blog-preview-token'
import { parseMarkdown } from '@/lib/markdown'
import { getDirectoryMemberById } from '@/lib/member-directory-store'

type PreviewProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function BlogPreviewPage({ params, searchParams }: PreviewProps) {
  const { slug } = await params
  const query = await searchParams
  const token = verifyBlogPreviewToken(query.token ?? null)
  if (!token || token.slug !== slug) {
    notFound()
  }
  const post = await getPostBySlug(slug)
  if (!post) notFound()
  const { blocks } = parseMarkdown(post.draftContent)
  const author = await getDirectoryMemberById(post.authorId)

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24 text-[var(--text-main)]">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-amber-300">Preview mode</p>
        <h1 className="text-4xl font-semibold">{post.title}</h1>
        <p className="mt-2 text-sm text-[var(--text-soft)]">{post.excerpt}</p>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Author: {author?.name ?? post.authorId}</p>
        <div className="mt-8 space-y-4">
          {blocks.map((block, index) => {
            if (block.type === 'h2') return <h2 key={`${block.id}-${index}`} className="text-2xl font-semibold">{block.text}</h2>
            if (block.type === 'h3') return <h3 key={`${block.id}-${index}`} className="text-xl font-semibold">{block.text}</h3>
            if (block.type === 'ul') return <ul key={`ul-${index}`} className="list-inside list-disc">{block.items.map((item) => <li key={`${item}-${index}`}>{item}</li>)}</ul>
            return <p key={`p-${index}`}>{block.text}</p>
          })}
        </div>
      </div>
    </main>
  )
}
