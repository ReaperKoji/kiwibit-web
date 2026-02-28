export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 pb-16 pt-28">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-80 rounded bg-[var(--surface-card)]" />
        <div className="h-12 rounded bg-[var(--surface-card)]" />
        <div className="h-64 rounded-2xl bg-[var(--surface-card)]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-72 rounded-xl bg-[var(--surface-card)]" />
          <div className="h-72 rounded-xl bg-[var(--surface-card)]" />
          <div className="h-72 rounded-xl bg-[var(--surface-card)]" />
        </div>
      </div>
    </main>
  )
}
