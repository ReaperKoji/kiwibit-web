import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { listPublishedPostsByAuthor } from '@/lib/blog-store'
import { getDirectoryMemberById } from '@/lib/member-directory-store'

type AuthorPageProps = {
  params: Promise<{ memberId: string }>
}

export default async function AuthorPostsPage({ params }: AuthorPageProps) {
  const { memberId } = await params
  const member = await getDirectoryMemberById(memberId)
  if (!member) notFound()
  const posts = await listPublishedPostsByAuthor(memberId)

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24 text-[var(--text-main)]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-4">
          <Image src={member.avatar_url} alt={member.name} width={72} height={72} className="h-18 w-18 rounded-full object-cover" />
          <div>
            <h1 className="text-4xl font-semibold">{member.name}</h1>
            <p className="text-sm text-[var(--text-soft)]">{member.role}</p>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="mt-2 text-sm text-[var(--text-soft)]">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="mt-3 inline-block text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Read post
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
