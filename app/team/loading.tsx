export default function TeamLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-[var(--surface-card)]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-56 rounded-xl bg-[var(--surface-card)]" />
          <div className="h-56 rounded-xl bg-[var(--surface-card)]" />
          <div className="h-56 rounded-xl bg-[var(--surface-card)]" />
        </div>
      </div>
    </main>
  )
}
