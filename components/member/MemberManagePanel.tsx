'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type EditableProject = {
  title: string
  image: string
  href: string
}

type EditableMember = {
  id: string
  codename?: string
  realName: string
  speciality: string
  bio: string
  clearance: string
  avatar: string
  contactEmail: string
  stack: string[]
  achievements: string[]
  projects: EditableProject[]
}

type MemberVersion = {
  id: string
  createdAt: string
  snapshot: Partial<EditableMember>
}

type ManagedResponse = {
  draft: EditableMember
  published: EditableMember
  hasDraftChanges: boolean
  versions: MemberVersion[]
  moderationStatus: 'draft' | 'pending_review' | 'published'
  pendingAt?: string
  role: 'member' | 'admin'
}

type PendingItem = {
  memberId: string
  pendingAt: string | null
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function formatDate(value: string) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function projectsToText(projects: EditableProject[]) {
  return projects.map((project) => `${project.title} | ${project.image} | ${project.href}`).join('\n')
}

function textToProjects(value: string): EditableProject[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, image, href] = line.split('|').map((part) => part.trim())
      return { title: title ?? '', image: image ?? '', href: href ?? '' }
    })
    .filter((project) => project.title && project.image && project.href)
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image loading failed'))
    img.src = src
  })
}

async function createCenteredSquareBlob(source: string, zoom: number): Promise<Blob> {
  const img = await loadImageElement(source)
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 800
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const minSide = Math.min(img.width, img.height)
  const effectiveZoom = Math.max(1, Math.min(2, zoom))
  const sourceSide = minSide / effectiveZoom
  const sourceX = (img.width - sourceSide) / 2
  const sourceY = (img.height - sourceSide) / 2
  ctx.drawImage(img, sourceX, sourceY, sourceSide, sourceSide, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image encoding failed'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      0.92
    )
  })
}

export default function MemberManagePanel() {
  const router = useRouter()
  const [draft, setDraft] = useState<EditableMember | null>(null)
  const [published, setPublished] = useState<EditableMember | null>(null)
  const [versions, setVersions] = useState<MemberVersion[]>([])
  const [hasDraftChanges, setHasDraftChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [uploadFeedback, setUploadFeedback] = useState('')
  const [rawPreviewImage, setRawPreviewImage] = useState<string | null>(null)
  const [cropZoom, setCropZoom] = useState(1)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [uploadToken, setUploadToken] = useState<string | null>(null)
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [moderationStatus, setModerationStatus] = useState<'draft' | 'pending_review' | 'published'>('published')
  const [pendingAt, setPendingAt] = useState<string | undefined>(undefined)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [pendingList, setPendingList] = useState<PendingItem[]>([])
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const member = draft

  const secureFetch = useCallback(async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers ?? {})
    if (!headers.has('content-type') && !(init?.body instanceof FormData)) {
      headers.set('content-type', 'application/json')
    }
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken)
    }
    return fetch(url, {
      ...init,
      headers,
    })
  }, [csrfToken])

  const applyServerState = useCallback((payload: ManagedResponse) => {
    setDraft(payload.draft)
    setPublished(payload.published)
    setVersions(payload.versions)
    setHasDraftChanges(payload.hasDraftChanges)
    setRole(payload.role)
    setModerationStatus(payload.moderationStatus)
    setPendingAt(payload.pendingAt)
    setDirty(false)
  }, [])

  const loadProfile = useCallback(async () => {
    const authResponse = await fetch('/api/auth/me')
    if (!authResponse.ok) {
      router.push('/login')
      return
    }
    const authData = (await authResponse.json()) as {
      csrfToken?: string
      role?: 'member' | 'admin'
      uploadTokens?: { memberAvatar?: string | null }
    }
    if (authData.csrfToken) setCsrfToken(authData.csrfToken)
    if (authData.uploadTokens?.memberAvatar) setUploadToken(authData.uploadTokens.memberAvatar)
    if (authData.role) setRole(authData.role)

    const response = await fetch('/api/member/me')
    if (!response.ok) {
      router.push('/login')
      return
    }
    const data = (await response.json()) as ManagedResponse
    applyServerState(data)
    if ((authData.role ?? data.role) === 'admin') {
      const pendingResponse = await fetch('/api/member/pending')
      if (pendingResponse.ok) {
        const pendingData = (await pendingResponse.json()) as { pending: PendingItem[] }
        setPendingList(pendingData.pending)
      }
    }
    setIsLoading(false)
  }, [applyServerState, router])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const previewAvatar = useMemo(() => {
    if (rawPreviewImage) return rawPreviewImage
    return member?.avatar ?? ''
  }, [member?.avatar, rawPreviewImage])

  const saveDraft = useCallback(async (showMessage = true) => {
    if (!draft) return false
    setIsSaving(true)
    if (showMessage) setFeedback('')
    const response = await secureFetch('/api/member/me', {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
    if (!response.ok) {
      if (showMessage) setFeedback('Nao foi possivel salvar o rascunho.')
      setIsSaving(false)
      return false
    }
    const data = (await response.json()) as ManagedResponse & { ok: boolean }
    applyServerState(data)
    const now = new Date().toLocaleTimeString('pt-BR')
    setSavedAt(now)
    if (showMessage) setFeedback('Rascunho salvo e nova versao criada.')
    setIsSaving(false)
    return true
  }, [applyServerState, draft, secureFetch])

  async function handleSaveDraft(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await saveDraft(true)
  }

  useEffect(() => {
    if (!dirty || isLoading) return
    if (autosaveRef.current) clearInterval(autosaveRef.current)
    autosaveRef.current = setInterval(() => {
      void saveDraft(false)
    }, 15000)
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current)
    }
  }, [dirty, isLoading, saveDraft])

  async function handlePublishOrSubmit() {
    setIsPublishing(true)
    setFeedback('')
    const response = await secureFetch('/api/member/me', {
      method: 'POST',
      body: JSON.stringify({ action: 'publish' }),
    })
    if (!response.ok) {
      setFeedback('Falha ao enviar publicacao.')
      setIsPublishing(false)
      return
    }
    const data = (await response.json()) as ManagedResponse & { ok: boolean }
    applyServerState(data)
    setFeedback(role === 'admin' ? 'Versao publicada com sucesso.' : 'Draft enviado para revisao.')
    setIsPublishing(false)
  }

  async function handleApproveCurrent() {
    if (!member) return
    const response = await secureFetch('/api/member/me', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', memberId: member.id }),
    })
    if (!response.ok) {
      setFeedback('Falha ao aprovar esse draft.')
      return
    }
    const data = (await response.json()) as { ok: true; managed: ManagedResponse }
    applyServerState(data.managed)
    setPendingList((list) => list.filter((item) => item.memberId !== member.id))
    setFeedback('Draft aprovado e publicado.')
  }

  async function handleApprovePendingMember(targetMemberId: string) {
    const response = await secureFetch('/api/member/me', {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', memberId: targetMemberId }),
    })
    if (!response.ok) {
      setFeedback(`Falha ao aprovar ${targetMemberId}.`)
      return
    }
    setPendingList((list) => list.filter((item) => item.memberId !== targetMemberId))
    if (targetMemberId === member?.id) {
      const data = (await response.json()) as { ok: true; managed: ManagedResponse }
      applyServerState(data.managed)
    }
    setFeedback(`Membro ${targetMemberId} aprovado.`)
  }

  async function handleRevert(versionId: string) {
    setFeedback('')
    const response = await secureFetch('/api/member/me', {
      method: 'POST',
      body: JSON.stringify({ action: 'revert', versionId }),
    })
    if (!response.ok) {
      setFeedback('Nao foi possivel reverter essa versao.')
      return
    }
    const data = (await response.json()) as ManagedResponse & { ok: boolean }
    applyServerState(data)
    setFeedback('Rascunho revertido para a versao selecionada.')
  }

  async function handleGeneratePreview() {
    const response = await secureFetch('/api/member/me', {
      method: 'POST',
      body: JSON.stringify({ action: 'preview' }),
    })
    if (!response.ok) {
      setFeedback('Falha ao gerar preview.')
      return
    }
    const data = (await response.json()) as { ok: true; previewUrl: string }
    setPreviewUrl(data.previewUrl)
  }

  function markDirty(update: EditableMember) {
    setDraft(update)
    setDirty(true)
  }

  function handleAvatarFileSelection(file: File | null) {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadFeedback('Formato invalido. Use JPG, PNG ou WEBP.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadFeedback('Imagem maior que 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setRawPreviewImage(typeof reader.result === 'string' ? reader.result : null)
      setCropZoom(1)
      setUploadFeedback('Preview carregado. Ajuste o zoom e envie.')
    }
    reader.readAsDataURL(file)
  }

  async function handleUploadAvatar() {
    if (!rawPreviewImage || !draft) return
    setIsUploading(true)
    setUploadFeedback('')
    try {
      const blob = await createCenteredSquareBlob(rawPreviewImage, cropZoom)
      const file = new File([blob], `avatar-${draft.id}.webp`, { type: 'image/webp' })
      const formData = new FormData()
      formData.append('file', file)
      const response = await secureFetch('/api/member/upload', {
        method: 'POST',
        headers: uploadToken ? { 'x-upload-token': uploadToken } : undefined,
        body: formData,
      })
      if (!response.ok) {
        setUploadFeedback('Falha no upload da imagem.')
        setIsUploading(false)
        return
      }
      const data = (await response.json()) as { ok: boolean; url: string }
      markDirty({ ...draft, avatar: data.url })
      setRawPreviewImage(null)
      setUploadFeedback('Upload concluido. Salve ou aguarde autosave.')
    } catch {
      setUploadFeedback('Falha ao processar a imagem.')
    }
    setIsUploading(false)
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (isLoading || !member || !published) {
    return <div className="min-h-screen bg-[var(--surface-bg)]" />
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] px-4 py-8 text-[var(--text-main)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-header)] p-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Member Control Center</p>
              <h1 className="mt-2 text-2xl font-semibold">Manage Your Profile</h1>
              <p className="mt-1 text-sm text-[var(--text-soft)]">Draft, review and publish workflow.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/member/${member.id}`} className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                View Public
              </Link>
              {role === 'admin' ? (
                <Link href="/admin/content" className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Blog Admin
                </Link>
              ) : null}
              <button onClick={handleGeneratePreview} className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Create Preview
              </button>
              <button onClick={handleLogout} className="rounded border border-[var(--surface-border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                Logout
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em]">
            <span className={`rounded border px-2 py-1 ${dirty ? 'border-amber-300/60 text-amber-200' : 'border-emerald-300/60 text-emerald-200'}`}>{dirty ? 'Unsaved edits' : 'No local edits'}</span>
            <span className="rounded border border-sky-300/60 px-2 py-1 text-sky-200">{moderationStatus}</span>
            {savedAt ? <span className="text-[var(--text-muted)]">Saved at {savedAt}</span> : null}
            {pendingAt ? <span className="text-[var(--text-muted)]">Pending since {formatDate(pendingAt)}</span> : null}
          </div>
          {previewUrl ? (
            <p className="mt-3 text-xs text-[var(--text-soft)]">
              Preview: <Link className="underline" href={previewUrl}>{previewUrl}</Link>
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
          <aside className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
            <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-[var(--surface-border)]">
              <Image src={previewAvatar} alt={member.realName} width={260} height={300} className="h-[300px] w-[260px] object-cover" />
            </div>
            <div className="mt-5 space-y-3">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => handleAvatarFileSelection(e.target.files?.[0] ?? null)} className="block w-full text-xs" />
              {rawPreviewImage ? (
                <div className="space-y-3 rounded border border-[var(--surface-border)] p-3">
                  <div className="h-40 w-full rounded border border-[var(--surface-border)] bg-center bg-no-repeat" style={{ backgroundImage: `url(${rawPreviewImage})`, backgroundSize: `${cropZoom * 100}%` }} />
                  <input type="range" min={1} max={2} step={0.05} value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="w-full" />
                  <button type="button" onClick={handleUploadAvatar} disabled={isUploading} className="rounded border border-[var(--text-main)] px-3 py-2 text-[10px] uppercase">
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              ) : null}
              {uploadFeedback ? <p className="text-xs text-[var(--text-soft)]">{uploadFeedback}</p> : null}
            </div>
          </aside>

          <section className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
            <form onSubmit={handleSaveDraft} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Real Name</span>
                  <input value={member.realName} onChange={(e) => markDirty({ ...member, realName: e.target.value })} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Speciality</span>
                  <input value={member.speciality} onChange={(e) => markDirty({ ...member, speciality: e.target.value })} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Clearance (admin only)</span>
                  <input disabled={role !== 'admin'} value={member.clearance} onChange={(e) => markDirty({ ...member, clearance: e.target.value })} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm disabled:opacity-50" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Contact Email (admin only)</span>
                  <input disabled={role !== 'admin'} value={member.contactEmail} onChange={(e) => markDirty({ ...member, contactEmail: e.target.value })} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm disabled:opacity-50" />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Bio</span>
                <textarea value={member.bio} onChange={(e) => markDirty({ ...member, bio: e.target.value })} rows={4} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
              </label>

              <label className="space-y-2 block">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Projects (title | image | href)</span>
                <textarea value={projectsToText(member.projects)} onChange={(e) => markDirty({ ...member, projects: textToProjects(e.target.value) })} rows={5} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Stack (comma separated)</span>
                  <textarea value={member.stack.join(', ')} onChange={(e) => markDirty({ ...member, stack: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} rows={4} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Achievements (one per line)</span>
                  <textarea value={member.achievements.join('\n')} onChange={(e) => markDirty({ ...member, achievements: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} rows={4} className="w-full rounded border border-[var(--surface-border)] bg-black/40 px-3 py-2 text-sm" />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={isSaving} className="rounded border border-[var(--text-main)] px-6 py-3 text-xs uppercase tracking-[0.18em] text-[var(--text-main)] disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save Draft'}
                </button>
                <button type="button" onClick={handlePublishOrSubmit} disabled={isPublishing || !hasDraftChanges} className="rounded border border-emerald-300/70 px-6 py-3 text-xs uppercase tracking-[0.18em] text-emerald-200 disabled:opacity-50">
                  {isPublishing ? 'Working...' : role === 'admin' ? 'Publish' : 'Submit Review'}
                </button>
                {role === 'admin' && moderationStatus === 'pending_review' ? (
                  <button type="button" onClick={handleApproveCurrent} className="rounded border border-sky-300/70 px-6 py-3 text-xs uppercase tracking-[0.18em] text-sky-200">
                    Approve Pending
                  </button>
                ) : null}
                {feedback ? <p className="text-sm text-[var(--text-soft)]">{feedback}</p> : null}
              </div>
            </form>
          </section>

          <aside className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
            <h3 className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">Version History</h3>
            <ul className="mt-4 space-y-3">
              {versions.slice(0, 12).map((version) => (
                <li key={version.id} className="rounded border border-[var(--surface-border)] bg-black/30 p-3">
                  <p className="text-xs text-[var(--text-soft)]">{formatDate(version.createdAt)}</p>
                  <button type="button" onClick={() => handleRevert(version.id)} className="mt-2 rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    Revert
                  </button>
                </li>
              ))}
            </ul>
            {role === 'admin' ? (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Pending reviews</p>
                <ul className="mt-2 space-y-2">
                  {pendingList.map((item) => (
                    <li key={item.memberId} className="rounded border border-[var(--surface-border)] p-2 text-xs">
                      <p>{item.memberId}</p>
                      <p className="text-[var(--text-soft)]">{item.pendingAt ? formatDate(item.pendingAt) : ''}</p>
                      <button type="button" onClick={() => handleApprovePendingMember(item.memberId)} className="mt-1 rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase">
                        Approve
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

