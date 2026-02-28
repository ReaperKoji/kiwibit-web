import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { MEMBER_GITHUB_USERNAMES } from '@/data/member-github'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { isStrongPassword, passwordPolicyMessage } from '@/lib/password-policy'

export type AccessRole = 'admin' | 'editor' | 'member_manager' | 'member'

export type MemberDirectoryRecord = {
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
  access_role?: AccessRole
  is_active: boolean
  deleted_at?: string
  created_at: string
}

export type MemberDirectoryInput = {
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
}

type DirectoryMeta = {
  github_url?: string
  linkedin_url?: string
  highlights?: string[]
  is_active?: boolean
  deleted_at?: string
  access_role?: AccessRole
}

function ensureDatabaseReady() {
  if (!isDatabaseEnabled()) {
    throw new Error('DATABASE_URL is required for member directory operations')
  }
}

function normalizeId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64)
}

function toCodename(id: string) {
  return id.replace(/-/g, '').toUpperCase().slice(0, 12) || randomUUID().slice(0, 8).toUpperCase()
}

function mapAccessRoleToDbRole(role: AccessRole) {
  if (role === 'admin') return 'admin'
  if (role === 'editor') return 'editor'
  if (role === 'member_manager') return 'member_manager'
  return 'member'
}

function mergeDirectoryMeta(base: MemberDirectoryRecord, meta?: DirectoryMeta): MemberDirectoryRecord {
  const metaActive = typeof meta?.is_active === 'boolean' ? meta.is_active : true
  return {
    ...base,
    github_url: meta?.github_url ?? base.github_url,
    linkedin_url: meta?.linkedin_url ?? base.linkedin_url,
    highlights: meta?.highlights ?? base.highlights ?? [],
    access_role: meta?.access_role ?? base.access_role ?? 'member',
    is_active: base.is_active && metaActive,
    deleted_at: meta?.deleted_at ?? base.deleted_at,
  }
}

function extractDirectoryMeta(raw: unknown): DirectoryMeta | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const asRecord = raw as Record<string, unknown>
  const meta = asRecord.directoryMeta
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return undefined
  return meta as DirectoryMeta
}

function injectDirectoryMeta(raw: unknown, meta: DirectoryMeta) {
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? ({ ...(raw as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>)
  base.directoryMeta = meta
  return base
}

function toJsonValue(value: Record<string, unknown>) {
  return value as unknown as Prisma.InputJsonValue
}

function toRecordFromDb(member: {
  id: string
  realName: string
  speciality: string
  bio: string
  avatar: string
  stack: string[]
  achievements: string[]
  createdAt: Date
  account?: { email: string; role: 'member' | 'admin' | 'editor' | 'member_manager'; isActive: boolean } | null
}): MemberDirectoryRecord {
  const username = MEMBER_GITHUB_USERNAMES[member.id]
  return {
    id: member.id,
    name: member.realName,
    role: member.speciality,
    bio: member.bio,
    avatar_url: member.avatar,
    specialties: member.stack,
    github_url: username ? `https://github.com/${username}` : undefined,
    linkedin_url: undefined,
    highlights: member.achievements,
    account_email: member.account?.email,
    access_role:
      member.account?.role === 'admin'
        ? 'admin'
        : member.account?.role === 'editor'
          ? 'editor'
          : member.account?.role === 'member_manager'
            ? 'member_manager'
            : 'member',
    is_active: member.account?.isActive ?? true,
    created_at: member.createdAt.toISOString(),
  }
}

export async function getAccessRoleForMember(memberId: string, fallbackRole: 'member' | 'admin'): Promise<AccessRole> {
  if (fallbackRole === 'admin') return 'admin'
  if (!isDatabaseEnabled()) return fallbackRole
  const state = await prisma.memberProfileState.findUnique({
    where: { memberId },
    select: { published: true, draft: true },
  })
  const publishedMeta = extractDirectoryMeta(state?.published)
  const draftMeta = extractDirectoryMeta(state?.draft)
  return publishedMeta?.access_role ?? draftMeta?.access_role ?? fallbackRole
}

export async function listDirectoryMembers(options?: { includeInactive?: boolean }) {
  if (!isDatabaseEnabled()) return [] as MemberDirectoryRecord[]
  const includeInactive = options?.includeInactive ?? false
  const rows = await prisma.member.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      realName: true,
      speciality: true,
      bio: true,
      avatar: true,
      stack: true,
      achievements: true,
      createdAt: true,
      account: { select: { email: true, role: true, isActive: true } },
      profileState: { select: { draft: true, published: true } },
    },
  })

  const mapped = rows.map((row) => {
    const base = toRecordFromDb(row)
    const publishedMeta = extractDirectoryMeta(row.profileState?.published)
    const draftMeta = extractDirectoryMeta(row.profileState?.draft)
    return mergeDirectoryMeta(base, publishedMeta ?? draftMeta)
  })
  return includeInactive ? mapped : mapped.filter((item) => item.is_active)
}

export async function getDirectoryMemberById(id: string) {
  const members = await listDirectoryMembers({ includeInactive: true })
  return members.find((item) => item.id === id) ?? null
}

export async function createDirectoryMember(input: MemberDirectoryInput) {
  ensureDatabaseReady()
  if (input.account_password && !isStrongPassword(input.account_password)) {
    throw new Error(passwordPolicyMessage())
  }
  const desiredRole = input.access_role ?? 'member'
  const baseId = normalizeId(input.name) || randomUUID().slice(0, 12)
  let id = baseId
  let attempt = 1
  while (await prisma.member.findUnique({ where: { id } })) {
    id = `${baseId}-${attempt}`
    attempt += 1
  }

  const created = await prisma.member.create({
    data: {
      id,
      codename: toCodename(id),
      realName: input.name,
      speciality: input.role,
      bio: input.bio,
      clearance: 'L-01',
      avatar: input.avatar_url,
      contactEmail: input.account_email ?? `${id}@kiwibit.com`,
      stack: input.specialties,
      achievements: input.highlights ?? [],
      account: input.account_email
        ? {
            create: {
              email: input.account_email.toLowerCase(),
              password: await hashPassword(input.account_password ?? 'kiwi1234'),
              role: mapAccessRoleToDbRole(desiredRole),
            },
          }
        : undefined,
    },
    select: {
      id: true,
      realName: true,
      speciality: true,
      bio: true,
      avatar: true,
      stack: true,
      achievements: true,
      createdAt: true,
      account: { select: { email: true, role: true, isActive: true } },
    },
  })

  await prisma.memberProfileState.upsert({
    where: { memberId: id },
    update: {
      draft: toJsonValue(
        injectDirectoryMeta({}, {
          github_url: input.github_url,
          linkedin_url: input.linkedin_url,
          highlights: input.highlights ?? [],
          is_active: true,
          access_role: desiredRole,
        })
      ),
      published: toJsonValue(
        injectDirectoryMeta({}, {
          github_url: input.github_url,
          linkedin_url: input.linkedin_url,
          highlights: input.highlights ?? [],
          is_active: true,
          access_role: desiredRole,
        })
      ),
    },
    create: {
      memberId: id,
      draft: toJsonValue(
        injectDirectoryMeta({}, {
          github_url: input.github_url,
          linkedin_url: input.linkedin_url,
          highlights: input.highlights ?? [],
          is_active: true,
          access_role: desiredRole,
        })
      ),
      published: toJsonValue(
        injectDirectoryMeta({}, {
          github_url: input.github_url,
          linkedin_url: input.linkedin_url,
          highlights: input.highlights ?? [],
          is_active: true,
          access_role: desiredRole,
        })
      ),
      versions: [],
    },
  })

  const base = toRecordFromDb(created)
  return mergeDirectoryMeta(base, {
    github_url: input.github_url,
    linkedin_url: input.linkedin_url,
    highlights: input.highlights ?? [],
    is_active: true,
    access_role: desiredRole,
  })
}

export async function updateDirectoryMember(id: string, input: MemberDirectoryInput) {
  ensureDatabaseReady()
  if (input.account_password && !isStrongPassword(input.account_password)) {
    throw new Error(passwordPolicyMessage())
  }
  const desiredRole = input.access_role ?? 'member'
  const existing = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      account: { select: { id: true } },
      profileState: { select: { draft: true, published: true } },
    },
  })
  if (!existing) return null

  const updated = await prisma.member.update({
    where: { id },
    data: {
      realName: input.name,
      speciality: input.role,
      bio: input.bio,
      avatar: input.avatar_url,
      stack: input.specialties,
      achievements: input.highlights ?? [],
    },
    select: {
      id: true,
      realName: true,
      speciality: true,
      bio: true,
      avatar: true,
      stack: true,
      achievements: true,
      createdAt: true,
      account: { select: { email: true, role: true, isActive: true } },
    },
  })

  if (input.account_email) {
    if (existing.account) {
      await prisma.memberAccount.update({
        where: { memberId: id },
        data: {
          email: input.account_email.toLowerCase(),
          ...(input.account_password ? { password: await hashPassword(input.account_password) } : {}),
          role: mapAccessRoleToDbRole(desiredRole),
        },
      })
    } else {
      await prisma.memberAccount.create({
        data: {
          memberId: id,
          email: input.account_email.toLowerCase(),
          password: await hashPassword(input.account_password ?? 'kiwi1234'),
          role: mapAccessRoleToDbRole(desiredRole),
        },
      })
    }
  }

  const previousDraft = existing.profileState?.draft
  const previousPublished = existing.profileState?.published
  const prevMeta = extractDirectoryMeta(previousPublished) ?? extractDirectoryMeta(previousDraft)
  const mergedMeta: DirectoryMeta = {
    ...prevMeta,
    github_url: input.github_url,
    linkedin_url: input.linkedin_url,
    highlights: input.highlights ?? [],
    access_role: desiredRole,
    is_active: prevMeta?.is_active ?? true,
    deleted_at: prevMeta?.deleted_at,
  }
  await prisma.memberProfileState.upsert({
    where: { memberId: id },
    update: {
      draft: toJsonValue(injectDirectoryMeta(previousDraft, mergedMeta)),
      published: toJsonValue(injectDirectoryMeta(previousPublished, mergedMeta)),
    },
    create: {
      memberId: id,
      draft: toJsonValue(injectDirectoryMeta({}, mergedMeta)),
      published: toJsonValue(injectDirectoryMeta({}, mergedMeta)),
      versions: [],
    },
  })

  return mergeDirectoryMeta(toRecordFromDb(updated), mergedMeta)
}

export async function softDeleteDirectoryMember(id: string) {
  ensureDatabaseReady()
  const existing = await prisma.member.findUnique({
    where: { id },
    select: { id: true, profileState: { select: { draft: true, published: true } } },
  })
  if (!existing) return false
  const draftMeta = extractDirectoryMeta(existing.profileState?.draft)
  const publishedMeta = extractDirectoryMeta(existing.profileState?.published)
  const now = new Date().toISOString()
  const nextMeta: DirectoryMeta = {
    ...(publishedMeta ?? draftMeta ?? {}),
    is_active: false,
    deleted_at: now,
  }
  await prisma.memberProfileState.upsert({
    where: { memberId: id },
    update: {
      draft: toJsonValue(injectDirectoryMeta(existing.profileState?.draft, nextMeta)),
      published: toJsonValue(injectDirectoryMeta(existing.profileState?.published, nextMeta)),
    },
    create: {
      memberId: id,
      draft: toJsonValue(injectDirectoryMeta({}, nextMeta)),
      published: toJsonValue(injectDirectoryMeta({}, nextMeta)),
      versions: [],
    },
  })
  await prisma.memberAccount.updateMany({
    where: { memberId: id },
    data: { isActive: false },
  })
  return true
}

export async function setDirectoryMemberActiveState(id: string, isActive: boolean) {
  ensureDatabaseReady()
  const existing = await prisma.member.findUnique({
    where: { id },
    select: { id: true, profileState: { select: { draft: true, published: true } } },
  })
  if (!existing) return false
  const draftMeta = extractDirectoryMeta(existing.profileState?.draft)
  const publishedMeta = extractDirectoryMeta(existing.profileState?.published)
  const nextMeta: DirectoryMeta = {
    ...(publishedMeta ?? draftMeta ?? {}),
    is_active: isActive,
    deleted_at: isActive ? undefined : new Date().toISOString(),
  }
  await prisma.memberProfileState.upsert({
    where: { memberId: id },
    update: {
      draft: toJsonValue(injectDirectoryMeta(existing.profileState?.draft, nextMeta)),
      published: toJsonValue(injectDirectoryMeta(existing.profileState?.published, nextMeta)),
    },
    create: {
      memberId: id,
      draft: toJsonValue(injectDirectoryMeta({}, nextMeta)),
      published: toJsonValue(injectDirectoryMeta({}, nextMeta)),
      versions: [],
    },
  })
  await prisma.memberAccount.updateMany({
    where: { memberId: id },
    data: { isActive: isActive },
  })
  return true
}
