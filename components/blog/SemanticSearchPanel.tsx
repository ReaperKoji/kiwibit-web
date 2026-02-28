'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'

type SemanticItem = {
  slug: string
  title: string
  score: number
  context: string
}

export default function SemanticSearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SemanticItem[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    const response = await fetch(`/api/blog/search/semantic?q=${encodeURIComponent(query)}`)
    const data = (await response.json()) as {
      results?: SemanticItem[]
      rag?: { summary?: string }
    }
    setResults(data.results ?? [])
    setSummary(data.rag?.summary ?? '')
    setLoading(false)
  }

  return (
    <section className="mb-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Semantic Search + RAG</p>
      <form onSubmit={onSearch} className="mt-3 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask: zero trust rollout for fintech"
          className="flex-1 rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded border border-[var(--surface-border)] px-4 py-2 text-xs uppercase tracking-[0.12em]">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {summary ? <pre className="mt-3 whitespace-pre-wrap rounded border border-[var(--surface-border)] p-3 text-xs text-[var(--text-soft)]">{summary}</pre> : null}
      {results.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {results.slice(0, 4).map((item) => (
            <Link key={item.slug} href={`/blog/${item.slug}`} className="rounded border border-[var(--surface-border)] p-3 text-xs">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-[var(--text-soft)]">{item.context}</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">score {item.score}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}
