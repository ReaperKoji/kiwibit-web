export default function MemberDetailLoading() {
  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24">
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="h-12 w-72 rounded bg-[var(--surface-card)]" />
        <div className="h-52 rounded-2xl bg-[var(--surface-card)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-40 rounded-xl bg-[var(--surface-card)]" />
          <div className="h-40 rounded-xl bg-[var(--surface-card)]" />
        </div>
      </div>
    </main>
  )
}
