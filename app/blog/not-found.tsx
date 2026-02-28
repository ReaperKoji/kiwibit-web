import Link from 'next/link'

export default function BlogNotFound() {
  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 pb-16 pt-28 text-[var(--text-main)]">
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 text-center">
        <h1 className="text-2xl font-semibold">Post not found</h1>
        <p className="mt-3 text-sm text-[var(--text-soft)]">The article may have been removed, unpublished, or the URL is incorrect.</p>
        <Link href="/blog" className="mt-5 inline-block rounded border border-[var(--surface-border)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
          Back to blog
        </Link>
      </div>
    </main>
  )
}
