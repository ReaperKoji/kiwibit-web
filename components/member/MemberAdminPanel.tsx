'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'

type AccessRole = 'admin' | 'editor' | 'member_manager' | 'member'

type MemberRecord = {
  id: string
  name: string
  role: string
  bio: string
  avatar_url: string
  specialties: string[]
  github_url?: string
  linkedin_url?: string
  highlights?: string[]
  account_email?: string
  account_password?: string
  access_role?: AccessRole
  is_active: boolean
  deleted_at?: string
  created_at: string
}

type FunnelMetrics = {
  created: number
  updated: number
  deleted: number
  validationErrors: number
  avgDurationMs: number
  errorRatePercent: number
}

type FunnelSeriesPoint = {
  date: string
  created: number
  updated: number
  deleted: number
  validationErrors: number
}

type SortKey = 'name' | 'role' | 'created_at'

function emptyMember(): MemberRecord {
  return {
    id: '',
    name: '',
    role: '',
    bio: '',
    avatar_url: '',
    specialties: [],
    github_url: '',
    linkedin_url: '',
    highlights: [],
    account_email: '',
    account_password: '',
    access_role: 'member',
    is_active: true,
    created_at: new Date().toISOString(),
  }
}

function looksLikeUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function validateMemberForm(form: MemberRecord, isCreateMode: boolean) {
  if (form.name.trim().length < 3) return 'Nome precisa ter pelo menos 3 caracteres.'
  if (form.role.trim().length < 2) return 'Cargo/função precisa ser informado.'
  if (form.bio.trim().length < 20) return 'Bio muito curta. Escreva pelo menos 20 caracteres.'
  if (form.specialties.length === 0) return 'Informe ao menos uma especialidade.'
  if (form.github_url && !looksLikeUrl(form.github_url)) return 'URL do GitHub inválida.'
  if (form.linkedin_url && !looksLikeUrl(form.linkedin_url)) return 'URL do LinkedIn inválida.'
  if (form.account_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.account_email)) return 'Email da conta inválido.'
  if (isCreateMode && form.account_password && form.account_password.length < 8) return 'Senha da conta deve ter pelo menos 8 caracteres.'
  return null
}

export default function MemberAdminPanel() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [adminUploadToken, setAdminUploadToken] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<MemberRecord>(emptyMember())
  const [feedback, setFeedback] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null)
  const [series, setSeries] = useState<FunnelSeriesPoint[]>([])
  const [period, setPeriod] = useState<7 | 30>(7)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const pageSize = 8

  const isCreateMode = useMemo(() => !selectedId, [selectedId])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const list = members.filter((member) => {
      const text = `${member.name} ${member.role} ${member.specialties.join(' ')}`.toLowerCase()
      const matchesQuery = q.length === 0 || text.includes(q)
      const matchesRole = roleFilter === 'all' || (member.access_role ?? 'member') === roleFilter
      return matchesQuery && matchesRole
    })

    return [...list].sort((a, b) => {
      if (sortKey === 'created_at') {
        const av = new Date(a.created_at).getTime()
        const bv = new Date(b.created_at).getTime()
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [members, query, roleFilter, sortDir, sortKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const auth = await fetch('/api/auth/me')
    if (!auth.ok) {
      setFeedback('Unauthorized session.')
      setIsLoading(false)
      return
    }
    const authData = (await auth.json()) as {
      csrfToken: string
      role: AccessRole
      uploadTokens?: { adminAvatar?: string | null }
    }
    if (authData.role !== 'admin' && authData.role !== 'member_manager') {
      setFeedback('Forbidden. Member manager access required.')
      setIsLoading(false)
      return
    }
    setCsrfToken(authData.csrfToken)
    setAdminUploadToken(authData.uploadTokens?.adminAvatar ?? null)

    const [membersResponse, metricsResponse] = await Promise.all([fetch('/api/admin/members'), fetch(`/api/admin/members/metrics?period=${period}`)])
    if (!membersResponse.ok) {
      setFeedback('Could not load members.')
      setIsLoading(false)
      return
    }

    const data = (await membersResponse.json()) as { members: MemberRecord[] }
    setMembers(data.members)
    if (metricsResponse.ok) {
      const metricsData = (await metricsResponse.json()) as { metrics: FunnelMetrics; series?: FunnelSeriesPoint[] }
      setMetrics(metricsData.metrics)
      setSeries(metricsData.series ?? [])
    }

    if (data.members.length > 0) {
      setSelectedId(data.members[0].id)
      setForm(data.members[0])
    } else {
      setSelectedId(null)
      setForm(emptyMember())
    }
    setIsLoading(false)
  }, [period])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function secureFetch(url: string, init?: RequestInit) {
    const headers = new Headers(init?.headers ?? {})
    if (!headers.has('content-type') && init?.body && !(init.body instanceof FormData)) {
      headers.set('content-type', 'application/json')
    }
    if (csrfToken) headers.set('x-csrf-token', csrfToken)
    return fetch(url, { ...init, headers })
  }

  async function refreshListAndSelect(memberId?: string) {
    const [membersResponse, metricsResponse] = await Promise.all([fetch('/api/admin/members'), fetch(`/api/admin/members/metrics?period=${period}`)])
    if (membersResponse.ok) {
      const data = (await membersResponse.json()) as { members: MemberRecord[] }
      setMembers(data.members)
      if (memberId) {
        const selected = data.members.find((item) => item.id === memberId)
        if (selected) {
          setSelectedId(selected.id)
          setForm(selected)
        }
      }
    }
    if (metricsResponse.ok) {
      const metricsData = (await metricsResponse.json()) as { metrics: FunnelMetrics; series?: FunnelSeriesPoint[] }
      setMetrics(metricsData.metrics)
      setSeries(metricsData.series ?? [])
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback('')
    const validationError = validateMemberForm(form, isCreateMode)
    if (validationError) {
      setFeedback(validationError)
      return
    }
    const payload = {
      name: form.name,
      role: form.role,
      bio: form.bio,
      avatar_url: form.avatar_url,
      specialties: form.specialties,
      github_url: form.github_url || undefined,
      linkedin_url: form.linkedin_url || undefined,
      highlights: form.highlights ?? [],
      account_email: form.account_email || undefined,
      account_password: form.account_password || undefined,
      access_role: form.access_role || 'member',
    }

    if (isCreateMode) {
      const response = await secureFetch('/api/admin/members', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as { member?: MemberRecord; error?: string }
      if (!response.ok || !data.member) {
        setFeedback(data.error ?? 'Could not create member.')
        return
      }
      setFeedback('Member created.')
      await refreshListAndSelect(data.member.id)
      return
    }

    const response = await secureFetch(`/api/admin/members/${form.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const data = (await response.json()) as { member?: MemberRecord; error?: string }
    if (!response.ok || !data.member) {
      setFeedback(data.error ?? 'Could not update member.')
      return
    }
    setFeedback('Member updated.')
    await refreshListAndSelect(data.member.id)
  }

  async function deleteMember() {
    if (!form.id) return
    const confirmation = window.prompt(`Type DELETE to confirm soft deletion of "${form.name}"`)
    if (confirmation !== 'DELETE') {
      setFeedback('Delete canceled. Confirmation keyword mismatch.')
      return
    }

    const response = await secureFetch(`/api/admin/members/${form.id}`, { method: 'DELETE' })
    const data = (await response.json()) as { ok?: boolean; error?: string }
    if (!response.ok) {
      setFeedback(data.error ?? 'Could not delete member.')
      return
    }
    setFeedback('Member soft-deleted.')
    await loadData()
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    const response = await secureFetch('/api/admin/members/avatar', {
      method: 'POST',
      headers: adminUploadToken ? { 'x-upload-token': adminUploadToken } : undefined,
      body,
    })
    const data = (await response.json()) as { url?: string; error?: string }
    if (!response.ok || !data.url) {
      setFeedback(data.error ?? 'Avatar upload failed.')
      return
    }
    setForm((current) => ({ ...current, avatar_url: data.url ?? current.avatar_url }))
    setFeedback('Avatar uploaded.')
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function runBulkAction(action: 'activate' | 'deactivate', ids: string[]) {
    if (ids.length === 0) {
      setFeedback('Select at least one member for bulk action.')
      return
    }
    const response = await secureFetch('/api/admin/members/bulk', {
      method: 'POST',
      body: JSON.stringify({ action, ids }),
    })
    const data = (await response.json()) as { ok?: boolean; updated?: number; error?: string }
    if (!response.ok || !data.ok) {
      setFeedback(data.error ?? 'Bulk action failed.')
      return
    }
    setSelectedIds([])
    setFeedback(`Bulk ${action} completed (${data.updated ?? 0} updated).`)
    await refreshListAndSelect(selectedId ?? undefined)
  }

  async function downloadCsv() {
    const response = await fetch(`/api/admin/members/metrics?period=${period}&format=csv`)
    if (!response.ok) {
      setFeedback('Could not export CSV metrics.')
      return
    }
    const csv = await response.text()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `member-funnel-${period}d.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[var(--surface-bg)] px-4 py-24 text-[var(--text-main)]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Admin Members</h1>
            <p className="text-sm text-[var(--text-soft)]">Create, edit, soft-delete, and manage account access for team records.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null)
              setForm(emptyMember())
            }}
            className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.14em]"
          >
            New Member
          </button>
        </header>

        {metrics ? (
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select value={period} onChange={(event) => setPeriod(event.target.value === '30' ? 30 : 7)} className="rounded border border-[var(--surface-border)] bg-black/30 px-2 py-1 text-xs">
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
              <button type="button" onClick={() => void downloadCsv()} className="rounded border border-[var(--surface-border)] px-2 py-1 text-xs uppercase tracking-[0.12em]">
                Export CSV
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Created: {metrics.created}</div>
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Updated: {metrics.updated}</div>
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Deleted: {metrics.deleted}</div>
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Validation errors: {metrics.validationErrors}</div>
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Avg response: {metrics.avgDurationMs} ms</div>
              <div className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-xs">Error rate: {metrics.errorRatePercent}%</div>
            </div>
            {series.length > 0 ? (
              <div className="mt-3 rounded border border-[var(--surface-border)] bg-[var(--surface-card)] p-3 text-[11px] text-[var(--text-soft)]">
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Historical series</p>
                <div className="grid gap-1">
                  {series.slice(-7).map((point) => (
                    <p key={point.date}>
                      {point.date}: c{point.created} u{point.updated} d{point.deleted} v{point.validationErrors}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Members</p>
            <div className="mt-3 space-y-2">
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                }}
                placeholder="Search member..."
                className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-2 py-1 text-xs"
              />
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value)
                  setPage(1)
                }}
                className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-2 py-1 text-xs"
              >
                <option value="all">All access roles</option>
                <option value="admin">admin</option>
                <option value="member_manager">member_manager</option>
                <option value="editor">editor</option>
                <option value="member">member</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-2 py-1 text-xs"
                >
                  <option value="name">Sort: name</option>
                  <option value="role">Sort: role</option>
                  <option value="created_at">Sort: created</option>
                </select>
                <select
                  value={sortDir}
                  onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}
                  className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-2 py-1 text-xs"
                >
                  <option value="asc">ASC</option>
                  <option value="desc">DESC</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void runBulkAction('activate', selectedIds)} className="rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                  Bulk Activate
                </button>
                <button type="button" onClick={() => void runBulkAction('deactivate', selectedIds)} className="rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                  Bulk Deactivate
                </button>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {paginated.map((member) => (
                <li key={member.id}>
                  <div
                    className={`rounded border px-3 py-2 text-left text-xs ${
                      selectedId === member.id ? 'border-[var(--text-main)]' : 'border-[var(--surface-border)]'
                    } ${member.is_active ? '' : 'opacity-60'}`}
                  >
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => toggleSelected(member.id)} />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(member.id)
                          setForm(member)
                        }}
                        className="w-full text-left"
                      >
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                          {member.role} - {member.access_role ?? 'member'}
                        </p>
                      </button>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-[var(--surface-border)] px-2 py-1">
                Prev
              </button>
              <span>
                {page}/{totalPages}
              </span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded border border-[var(--surface-border)] px-2 py-1">
                Next
              </button>
            </div>
          </aside>

          <section className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            {isLoading ? <p className="text-sm text-[var(--text-soft)]">Loading...</p> : null}
            {!isLoading ? (
              <form onSubmit={submitForm} className="space-y-3">
                <div className="rounded border border-[var(--surface-border)] p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Profile status</p>
                  <p className="mt-1 font-semibold">{form.is_active ? 'active' : 'inactive'}</p>
                  {!isCreateMode ? (
                    <button
                      type="button"
                      onClick={() => void runBulkAction(form.is_active ? 'deactivate' : 'activate', [form.id])}
                      className="mt-2 rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]"
                    >
                      {form.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  ) : null}
                </div>

                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Member Profile</p>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Role" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} rows={4} placeholder="Bio" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input value={form.avatar_url} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} placeholder="Avatar URL" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadAvatar(event.target.files?.[0] ?? null)} className="w-full text-xs" />
                <input value={form.specialties.join(', ')} onChange={(event) => setForm({ ...form, specialties: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Specialties (comma separated)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input value={form.github_url ?? ''} onChange={(event) => setForm({ ...form, github_url: event.target.value })} placeholder="GitHub URL (optional)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input value={form.linkedin_url ?? ''} onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })} placeholder="LinkedIn URL (optional)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <textarea value={(form.highlights ?? []).join('\n')} onChange={(event) => setForm({ ...form, highlights: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} rows={4} placeholder="Highlights (one per line, optional)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />

                <p className="pt-2 text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">Access Account</p>
                <input value={form.account_email ?? ''} onChange={(event) => setForm({ ...form, account_email: event.target.value })} placeholder="Account email (optional)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <input type="password" value={form.account_password ?? ''} onChange={(event) => setForm({ ...form, account_password: event.target.value })} placeholder="Account password (optional)" className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm" />
                <select value={form.access_role ?? 'member'} onChange={(event) => setForm({ ...form, access_role: event.target.value as AccessRole })} className="w-full rounded border border-[var(--surface-border)] bg-black/30 px-3 py-2 text-sm">
                  <option value="member">member</option>
                  <option value="editor">editor</option>
                  <option value="member_manager">member_manager</option>
                  <option value="admin">admin</option>
                </select>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="rounded border border-[var(--text-main)] px-4 py-2 text-xs uppercase tracking-[0.14em]">
                    {isCreateMode ? 'Create' : 'Update'}
                  </button>
                  {!isCreateMode ? (
                    <button type="button" onClick={() => void deleteMember()} className="rounded border border-red-400/60 px-4 py-2 text-xs uppercase tracking-[0.14em] text-red-300">
                      Soft Delete
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}
            {feedback ? <p className="mt-3 text-xs text-[var(--text-soft)]">{feedback}</p> : null}
          </section>
        </div>
      </div>
    </main>
  )
}
