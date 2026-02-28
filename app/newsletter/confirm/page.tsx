import { confirmSubscriberByToken } from '@/lib/newsletter-store'

type ConfirmPageProps = {
  searchParams: Promise<{ token?: string }>
}

export default async function NewsletterConfirmPage({ searchParams }: ConfirmPageProps) {
  const { token } = await searchParams
  const confirmed = token ? await confirmSubscriberByToken(token) : null

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24 text-[var(--text-main)]">
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 text-center">
        <h1 className="text-3xl font-semibold">Newsletter Confirmation</h1>
        <p className="mt-3 text-sm text-[var(--text-soft)]">
          {confirmed ? 'Your subscription is confirmed.' : 'Invalid or expired token.'}
        </p>
      </div>
    </main>
  )
}
