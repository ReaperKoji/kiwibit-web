import { Prisma } from '@prisma/client'
import { type Member } from '@/data/members'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'

const MAX_VERSIONS = 30

type MemberOverride = Partial<Omit<Member, 'id' | 'codename'>>

export type MemberVersion = {
  id: string
  createdAt: string
  snapshot: MemberOverride
}

type MemberStoredState = {
  draft: MemberOverride
  published: MemberOverride
  versions: MemberVersion[]
  moderationStatus: 'draft' | 'pending_review' | 'published'
  pendingAt?: string
}

export type ManagedMemberState = {
  draft: Member
  published: Member
  hasDraftChanges: boolean
  versions: MemberVersion[]
  moderationStatus: 'draft' | 'pending_review' | 'published'
  pendingAt?: string
}

function ensureDatabaseReady() {
  if (!isDatabaseEnabled()) {
    throw new Error('DATABASE_URL is required for member profile operations')
  }
}

function generateVersionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeSkillArray(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const typed = item as { name?: unknown; category?: unknown }
      if (typeof typed.name !== 'string') return null
      if (typed.category !== 'technical') return null
      return { name: typed.name, category: 'technical' as const }
    })
    .filter((item): item is { name: string; category: 'technical' } => Boolean(item))
}

function normalizeProjectsArray(value: unknown) {
  if (!Array.isArray(value)) return undefined
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const typed = item as { title?: unknown; image?: unknown; href?: unknown }
      if (typeof typed.title !== 'string' || typeof typed.image !== 'string' || typeof typed.href !== 'string') return null
      return { title: typed.title, image: typed.image, href: typed.href }
    })
    .filter((item): item is { title: string; image: string; href: string } => Boolean(item))
}

function sanitizeMemberOverride(patch: MemberOverride): MemberOverride {
  const allowed: MemberOverride = {}
  if (typeof patch.realName === 'string') allowed.realName = patch.realName
  if (typeof patch.speciality === 'string') allowed.speciality = patch.speciality
  if (typeof patch.bio === 'string') allowed.bio = patch.bio
  if (typeof patch.clearance === 'string') allowed.clearance = patch.clearance
  if (typeof patch.avatar === 'string') allowed.avatar = patch.avatar
  if (typeof patch.contactEmail === 'string') allowed.contactEmail = patch.contactEmail

  if (Array.isArray(patch.stack)) {
    allowed.stack = patch.stack.filter((item): item is string => typeof item === 'string')
  }
  if (Array.isArray(patch.achievements)) {
    allowed.achievements = patch.achievements.filter((item): item is string => typeof item === 'string')
  }

  const normalizedSkills = normalizeSkillArray(patch.skills)
  if (normalizedSkills) allowed.skills = normalizedSkills

  const normalizedProjects = normalizeProjectsArray(patch.projects)
  if (normalizedProjects) allowed.projects = normalizedProjects

  return allowed
}

function hasDraftChanges(base: Member, state: MemberStoredState) {
  const draftMember = { ...base, ...state.draft }
  const publishedMember = { ...base, ...state.published }
  return JSON.stringify(draftMember) !== JSON.stringify(publishedMember)
}

function buildVersion(snapshot: MemberOverride): MemberVersion {
  return {
    id: generateVersionId(),
    createdAt: new Date().toISOString(),
    snapshot,
  }
}

function mapDbMemberToMember(input: {
  id: string
  codename: string
  realName: string
  speciality: string
  bio: string
  clearance: string
  avatar: string
  stack: string[]
  achievements: string[]
  contactEmail: string
}): Member {
  return {
    id: input.id,
    codename: input.codename,
    realName: input.realName,
    speciality: input.speciality,
    bio: input.bio,
    clearance: input.clearance,
    avatar: input.avatar,
    skills: [],
    stack: input.stack,
    achievements: input.achievements,
    projects: [],
    contactEmail: input.contactEmail,
  }
}

async function getBaseMemberById(memberId: string): Promise<Member | null> {
  if (!isDatabaseEnabled()) return null
  const row = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      codename: true,
      realName: true,
      speciality: true,
      bio: true,
      clearance: true,
      avatar: true,
      stack: true,
      achievements: true,
      contactEmail: true,
    },
  })
  if (!row) return null
  return mapDbMemberToMember(row)
}

function toMemberStoredStateFromDb(input: {
  draft: unknown
  published: unknown
  versions: unknown
  moderationStatus: 'draft' | 'pending_review' | 'published'
  pendingAt: Date | null
}): MemberStoredState {
  return {
    draft: sanitizeMemberOverride((input.draft ?? {}) as MemberOverride),
    published: sanitizeMemberOverride((input.published ?? {}) as MemberOverride),
    versions: Array.isArray(input.versions) ? (input.versions as MemberVersion[]) : [],
    moderationStatus: input.moderationStatus,
    pendingAt: input.pendingAt?.toISOString(),
  }
}

async function ensureDbState(memberId: string): Promise<MemberStoredState> {
  ensureDatabaseReady()
  const existing = await prisma.memberProfileState.findUnique({
    where: { memberId },
    select: {
      draft: true,
      published: true,
      versions: true,
      moderationStatus: true,
      pendingAt: true,
    },
  })
  if (existing) {
    return toMemberStoredStateFromDb({
      draft: existing.draft,
      published: existing.published,
      versions: existing.versions,
      moderationStatus: existing.moderationStatus,
      pendingAt: existing.pendingAt,
    })
  }

  await prisma.memberProfileState.create({
    data: {
      memberId,
      draft: {},
      published: {},
      versions: [],
      moderationStatus: 'published',
    },
  })
  return {
    draft: {},
    published: {},
    versions: [],
    moderationStatus: 'published',
  }
}

async function saveDbState(memberId: string, state: MemberStoredState) {
  ensureDatabaseReady()
  const draftJson = state.draft as unknown as Prisma.InputJsonValue
  const publishedJson = state.published as unknown as Prisma.InputJsonValue
  const versionsJson = state.versions as unknown as Prisma.InputJsonValue
  await prisma.memberProfileState.upsert({
    where: { memberId },
    create: {
      memberId,
      draft: draftJson,
      published: publishedJson,
      versions: versionsJson,
      moderationStatus: state.moderationStatus,
      pendingAt: state.pendingAt ? new Date(state.pendingAt) : null,
    },
    update: {
      draft: draftJson,
      published: publishedJson,
      versions: versionsJson,
      moderationStatus: state.moderationStatus,
      pendingAt: state.pendingAt ? new Date(state.pendingAt) : null,
    },
  })
}

export async function getPublishedMemberById(memberId: string): Promise<Member | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await prisma.memberProfileState.findUnique({
    where: { memberId },
    select: { published: true },
  })
  return { ...base, ...sanitizeMemberOverride((state?.published ?? {}) as MemberOverride) }
}

export async function getMergedMemberById(memberId: string): Promise<Member | null> {
  return getPublishedMemberById(memberId)
}

export async function getManagedMemberById(memberId: string): Promise<ManagedMemberState | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await ensureDbState(memberId)
  return {
    draft: { ...base, ...state.draft },
    published: { ...base, ...state.published },
    hasDraftChanges: hasDraftChanges(base, state),
    versions: state.versions,
    moderationStatus: state.moderationStatus,
    pendingAt: state.pendingAt,
  }
}

export async function saveDraftMemberById(memberId: string, patch: MemberOverride): Promise<ManagedMemberState | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await ensureDbState(memberId)
  const sanitizedPatch = sanitizeMemberOverride(patch)
  const nextDraft = {
    ...state.draft,
    ...sanitizedPatch,
  }
  state.draft = nextDraft
  if (state.moderationStatus === 'published') state.moderationStatus = 'draft'
  state.versions = [buildVersion(nextDraft), ...state.versions].slice(0, MAX_VERSIONS)
  await saveDbState(memberId, state)

  return {
    draft: { ...base, ...state.draft },
    published: { ...base, ...state.published },
    hasDraftChanges: hasDraftChanges(base, state),
    versions: state.versions,
    moderationStatus: state.moderationStatus,
    pendingAt: state.pendingAt,
  }
}

export async function publishDraftMemberById(memberId: string, role: 'member' | 'admin'): Promise<ManagedMemberState | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await ensureDbState(memberId)
  if (role === 'admin') {
    state.published = { ...state.draft }
    state.moderationStatus = 'published'
    state.pendingAt = undefined
  } else {
    state.moderationStatus = 'pending_review'
    state.pendingAt = new Date().toISOString()
  }
  await saveDbState(memberId, state)

  return {
    draft: { ...base, ...state.draft },
    published: { ...base, ...state.published },
    hasDraftChanges: hasDraftChanges(base, state),
    versions: state.versions,
    moderationStatus: state.moderationStatus,
    pendingAt: state.pendingAt,
  }
}

export async function approvePendingMemberById(memberId: string): Promise<ManagedMemberState | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await ensureDbState(memberId)
  state.published = { ...state.draft }
  state.moderationStatus = 'published'
  state.pendingAt = undefined
  await saveDbState(memberId, state)

  return {
    draft: { ...base, ...state.draft },
    published: { ...base, ...state.published },
    hasDraftChanges: hasDraftChanges(base, state),
    versions: state.versions,
    moderationStatus: state.moderationStatus,
    pendingAt: state.pendingAt,
  }
}

export async function revertDraftMemberByVersion(memberId: string, versionId: string): Promise<ManagedMemberState | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await ensureDbState(memberId)
  const selected = state.versions.find((version) => version.id === versionId)
  if (!selected) return null

  state.draft = sanitizeMemberOverride(selected.snapshot)
  if (state.moderationStatus === 'published') state.moderationStatus = 'draft'
  state.versions = [buildVersion(state.draft), ...state.versions].slice(0, MAX_VERSIONS)
  await saveDbState(memberId, state)

  return {
    draft: { ...base, ...state.draft },
    published: { ...base, ...state.published },
    hasDraftChanges: hasDraftChanges(base, state),
    versions: state.versions,
    moderationStatus: state.moderationStatus,
    pendingAt: state.pendingAt,
  }
}

export async function getDraftMemberById(memberId: string): Promise<Member | null> {
  const base = await getBaseMemberById(memberId)
  if (!base) return null
  if (!isDatabaseEnabled()) return null

  const state = await prisma.memberProfileState.findUnique({
    where: { memberId },
    select: { draft: true },
  })
  return { ...base, ...sanitizeMemberOverride((state?.draft ?? {}) as MemberOverride) }
}
