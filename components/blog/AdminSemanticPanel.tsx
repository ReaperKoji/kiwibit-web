'use client'

import { FormEvent, useState } from 'react'

type SemanticResult = {
  slug: string
  title: string
  score: number
  context: string
}

type Props = {
  secureFetch: (url: string, init?: RequestInit) => Promise<Response>
}

export default function AdminSemanticPanel({ secureFetch }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticResult[]>([])
  const [summary, setSummary] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const response = await secureFetch('/api/admin/semantic', {
      method: 'POST',
      body: JSON.stringify({ action: 'search', q: query }),
    })
    const data = (await response.json()) as { results?: SemanticResult[]; rag?: { summary?: string }; error?: string }
    if (!response.ok) {
      setFeedback(data.error ?? 'Semantic search failed.')
      setLoading(false)
      return
    }
    setResults(data.results ?? [])
    setSummary(data.rag?.summary ?? '')
    setFeedback('Semantic search completed.')
    setLoading(false)
  }

  async function onReindex() {
    setFeedback('')
    const response = await secureFetch('/api/admin/semantic', {
      method: 'POST',
      body: JSON.stringify({ action: 'reindex' }),
    })
    const data = (await response.json()) as { result?: { indexed?: number }; error?: string }
    if (!response.ok) {
      setFeedback(data.error ?? 'Reindex failed.')
      return
    }
    setFeedback(`Reindex complete: ${data.result?.indexed ?? 0} posts.`)
  }

  return (
    <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Semantic Console</p>
        <button type="button" onClick={() => void onReindex()} className="rounded border border-[var(--surface-border)] px-3 py-1 text-[10px] uppercase tracking-[0.12em]">
          Reindex Embeddings
        </button>
      </div>
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask a question over the blog corpus..."
          className="flex-1 rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.12em]">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {summary ? <pre className="mt-3 whitespace-pre-wrap rounded border border-[var(--surface-border)] p-3 text-xs text-[var(--text-soft)]">{summary}</pre> : null}
      {results.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {results.slice(0, 6).map((item) => (
            <article key={item.slug} className="rounded border border-[var(--surface-border)] p-3 text-xs">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-[var(--text-soft)]">{item.context}</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">score {item.score}</p>
            </article>
          ))}
        </div>
      ) : null}
      {feedback ? <p className="mt-2 text-xs text-[var(--text-soft)]">{feedback}</p> : null}
    </section>
  )
}
