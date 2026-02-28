import 'dotenv/config'
import { PrismaClient, type CommentStatus, type NewsletterStatus, type PostStatus, type UserRole } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { promises as fs } from 'fs'
import path from 'path'
import { BLOG_SEED_POSTS } from '../data/blog-seed'
import { MEMBER_ACCOUNTS } from '../data/member-accounts'
import { MEMBERS_BY_ID } from '../data/members'
import { hashPassword, isHashedPassword } from '../lib/password'

const prisma = new PrismaClient()

async function loadJson<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'data', fileName), 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function seedMembers() {
  const legacyOverrides = await loadJson<{
    members?: Record<
      string,
      {
        draft?: Record<string, unknown>
        published?: Record<string, unknown>
        versions?: Array<{
          id: string
          createdAt: string
          snapshot: Record<string, unknown>
        }>
        moderationStatus?: 'draft' | 'pending_review' | 'published'
        pendingAt?: string
      }
    >
  }>('member-overrides.json', {})

  for (const member of Object.values(MEMBERS_BY_ID)) {
    const legacyState = legacyOverrides.members?.[member.id]
    const draftJson = ((legacyState?.draft ?? {}) as Record<string, unknown>) as unknown as Prisma.InputJsonValue
    const publishedJson = ((legacyState?.published ?? {}) as Record<string, unknown>) as unknown as Prisma.InputJsonValue
    const versionsJson = ((legacyState?.versions ?? []) as Array<{ id: string; createdAt: string; snapshot: Record<string, unknown> }>) as unknown as Prisma.InputJsonValue

    await prisma.member.upsert({
      where: { id: member.id },
      update: {
        codename: member.codename,
        realName: member.realName,
        speciality: member.speciality,
        bio: member.bio,
        clearance: member.clearance,
        avatar: member.avatar,
        contactEmail: member.contactEmail,
        stack: member.stack,
        achievements: member.achievements,
      },
      create: {
        id: member.id,
        codename: member.codename,
        realName: member.realName,
        speciality: member.speciality,
        bio: member.bio,
        clearance: member.clearance,
        avatar: member.avatar,
        contactEmail: member.contactEmail,
        stack: member.stack,
        achievements: member.achievements,
      },
    })

    await prisma.memberProfileState.upsert({
      where: { memberId: member.id },
      update: {
        draft: draftJson,
        published: publishedJson,
        versions: versionsJson,
        moderationStatus: legacyState?.moderationStatus ?? 'published',
        pendingAt: legacyState?.pendingAt ? new Date(legacyState.pendingAt) : null,
      },
      create: {
        memberId: member.id,
        draft: draftJson,
        published: publishedJson,
        versions: versionsJson,
        moderationStatus: legacyState?.moderationStatus ?? 'published',
        pendingAt: legacyState?.pendingAt ? new Date(legacyState.pendingAt) : null,
      },
    })
  }
}

async function seedAccounts() {
  for (const account of MEMBER_ACCOUNTS) {
    await prisma.memberAccount.upsert({
      where: { memberId: account.memberId },
      update: {
        email: account.email.toLowerCase(),
        password: isHashedPassword(account.password) ? account.password : await hashPassword(account.password),
        role: account.role as UserRole,
      },
      create: {
        memberId: account.memberId,
        email: account.email.toLowerCase(),
        password: isHashedPassword(account.password) ? account.password : await hashPassword(account.password),
        role: account.role as UserRole,
      },
    })
  }
}

async function seedPostsAndComments() {
  const postsStore = await loadJson<{ posts: typeof BLOG_SEED_POSTS }>('blog-posts.json', { posts: BLOG_SEED_POSTS })
  const posts = Array.isArray(postsStore.posts) && postsStore.posts.length > 0 ? postsStore.posts : BLOG_SEED_POSTS
  const commentsStore = await loadJson<{
    comments: Array<{
      id: string
      slug: string
      name: string
      email: string
      message: string
      createdAt: string
      status: 'pending' | 'approved' | 'rejected'
      ip: string
    }>
  }>('blog-comments.json', { comments: [] })

  for (const post of posts) {
    const upserted = await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        authorId: post.authorId,
        tags: post.tags,
        categories: post.categories,
        status: post.status as PostStatus,
        featured: post.featured,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
        draftContent: post.draftContent,
        publishedContent: post.publishedContent ?? null,
      },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        authorId: post.authorId,
        tags: post.tags,
        categories: post.categories,
        status: post.status as PostStatus,
        featured: post.featured,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt),
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
        draftContent: post.draftContent,
        publishedContent: post.publishedContent ?? null,
      },
    })

    for (const comment of commentsStore.comments.filter((item) => item.slug === post.slug)) {
      await prisma.blogComment.upsert({
        where: { id: comment.id },
        update: {
          postId: upserted.id,
          name: comment.name,
          email: comment.email,
          message: comment.message,
          status: comment.status as CommentStatus,
          ip: comment.ip,
          createdAt: new Date(comment.createdAt),
        },
        create: {
          id: comment.id,
          postId: upserted.id,
          name: comment.name,
          email: comment.email,
          message: comment.message,
          status: comment.status as CommentStatus,
          ip: comment.ip,
          createdAt: new Date(comment.createdAt),
        },
      })
    }
  }
}

async function seedNewsletter() {
  const newsletterStore = await loadJson<{
    subscribers: Array<{
      id: string
      email: string
      token: string
      status: 'pending' | 'confirmed'
      createdAt: string
      confirmedAt?: string
    }>
  }>('newsletter-subscribers.json', { subscribers: [] })

  for (const item of newsletterStore.subscribers) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: item.email.toLowerCase() },
      update: {
        token: item.token,
        status: item.status as NewsletterStatus,
        createdAt: new Date(item.createdAt),
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
      },
      create: {
        id: item.id,
        email: item.email.toLowerCase(),
        token: item.token,
        status: item.status as NewsletterStatus,
        createdAt: new Date(item.createdAt),
        confirmedAt: item.confirmedAt ? new Date(item.confirmedAt) : null,
      },
    })
  }
}

async function main() {
  await seedMembers()
  await seedAccounts()
  await seedPostsAndComments()
  await seedNewsletter()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
