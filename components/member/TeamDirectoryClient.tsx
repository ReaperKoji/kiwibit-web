'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type TeamMember = {
  id: string
  name: string
  role: string
  bio: string
  avatar_url: string
  specialties: string[]
  github_url?: string
  linkedin_url?: string
  highlights?: string[]
}

type RankingItem = {
  memberId: string
  name: string
  score: number
  level: string
}

export default function TeamDirectoryClient() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [ranking, setRanking] = useState<RankingItem[]>([])

  useEffect(() => {
    let active = true
    async function loadMembers() {
      setIsLoading(true)
      setError('')
      const [response, rankingResponse] = await Promise.all([fetch('/api/members'), fetch('/api/member/reputation/ranking')])
      if (!response.ok) {
        if (active) setError('Could not load members.')
        setIsLoading(false)
        return
      }
      const data = (await response.json()) as { members: TeamMember[] }
      if (active) setMembers(data.members)
      if (rankingResponse.ok) {
        const rankingData = (await rankingResponse.json()) as { items: RankingItem[] }
        if (active) setRanking(rankingData.items)
      }
      setIsLoading(false)
    }
    void loadMembers()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return members
    return members.filter((member) => `${member.name} ${member.role} ${member.specialties.join(' ')}`.toLowerCase().includes(q))
  }, [members, query])

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 text-[var(--text-main)]">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Team Directory</p>
        <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Our Members</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--text-soft)]">Dynamic team data loaded from API with profile links and specialties.</p>
      </header>

      <div className="mb-6">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, role or specialty..."
          className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm"
        />
      </div>

      {ranking.length > 0 ? (
        <section className="mb-6 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Global Reputation Ranking</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {ranking.slice(0, 6).map((item, index) => (
              <div key={item.memberId} className="rounded border border-[var(--surface-border)] p-3 text-xs">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">#{index + 1} {item.level}</p>
                <p className="mt-1 font-semibold">{item.name}</p>
                <p className="mt-1 text-[var(--text-soft)]">score {item.score}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
              <div className="h-40 w-full animate-pulse rounded bg-black/20" />
              <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-black/20" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-black/20" />
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="rounded border border-red-400/40 bg-red-950/20 px-3 py-2 text-sm text-red-200">{error}</p> : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <p className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-3 text-sm text-[var(--text-soft)]">No members found.</p>
      ) : null}

      {!isLoading && !error ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member) => (
            <article key={member.id} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
              <Image src={member.avatar_url} alt={member.name} width={600} height={340} className="h-44 w-full rounded object-cover" />
              <h2 className="mt-4 text-xl font-semibold">{member.name}</h2>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{member.role}</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">{member.bio}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {member.specialties.map((item) => (
                  <span key={`${member.id}-${item}`} className="rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em]">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {member.github_url ? (
                  <a href={member.github_url} target="_blank" rel="noreferrer" className="rounded border border-[var(--surface-border)] px-2 py-1 hover:border-[var(--text-main)]">
                    GitHub
                  </a>
                ) : null}
                {member.linkedin_url ? (
                  <a href={member.linkedin_url} target="_blank" rel="noreferrer" className="rounded border border-[var(--surface-border)] px-2 py-1 hover:border-[var(--text-main)]">
                    LinkedIn
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
