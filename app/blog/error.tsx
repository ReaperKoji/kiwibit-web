'use client'

export default function BlogError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 pb-16 pt-28 text-[var(--text-main)]">
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 text-center">
        <h1 className="text-2xl font-semibold">Blog unavailable right now</h1>
        <p className="mt-3 text-sm text-[var(--text-soft)]">We could not load this content. Try again in a few seconds.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded border border-[var(--surface-border)] px-4 py-2 text-xs uppercase tracking-[0.14em]"
        >
          Retry
        </button>
      </div>
    </main>
  )
}
