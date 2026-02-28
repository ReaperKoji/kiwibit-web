import { z } from 'zod'
import { BLOG_FIXED_CATEGORIES } from '@/data/blog-editorial'
import { isStrongPassword, passwordPolicyMessage } from '@/lib/password-policy'

export const skillSchema = z.object({
  name: z.string().min(2).max(60),
  category: z.literal('technical'),
})

export const projectSchema = z.object({
  title: z.string().min(2).max(120),
  image: z.string().url().or(z.string().regex(/^\/uploads\/.+/)),
  href: z.string().url(),
})

export const memberDraftSchema = z.object({
  realName: z.string().min(2).max(80).optional(),
  speciality: z.string().min(2).max(100).optional(),
  bio: z.string().min(20).max(1000).optional(),
  clearance: z.string().min(2).max(20).optional(),
  avatar: z.string().url().or(z.string().regex(/^\/uploads\/.+/)).optional(),
  contactEmail: z.string().email().optional(),
  stack: z.array(z.string().min(1).max(30)).max(20).optional(),
  achievements: z.array(z.string().min(3).max(160)).max(30).optional(),
  skills: z.array(skillSchema).max(30).optional(),
  projects: z.array(projectSchema).max(20).optional(),
})

export const contactSchema = z.object({
  memberId: z.string().min(1),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
})

export const blogPostInputSchema = z.object({
  slug: z.string().min(2).max(120).optional(),
  title: z.string().min(8).max(180),
  excerpt: z.string().min(20).max(320),
  coverImage: z.string().url().or(z.string().regex(/^\/uploads\/.+/)),
  authorId: z.string().min(1),
  tags: z.array(z.string().min(1).max(40)).min(1).max(12),
  categories: z.array(z.enum(BLOG_FIXED_CATEGORIES)).min(1).max(3),
  featured: z.boolean(),
  draftContent: z.string().min(60).max(20000),
})

export const blogPostActionSchema = z.object({
  action: z.enum(['save', 'submit_review', 'publish', 'schedule', 'approve', 'preview']),
  slug: z.string().min(1).optional(),
  scheduledFor: z.string().datetime().optional(),
  post: blogPostInputSchema.optional(),
})

export const blogCommentSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(8).max(1200),
})

export const newsletterSchema = z.object({
  email: z.string().email(),
  segment: z.string().min(2).max(60).optional(),
  source: z.string().min(2).max(80).optional(),
  variant: z.enum(['A', 'B']).optional(),
  visitorId: z.string().min(3).max(80).optional(),
})

export const memberDirectorySchema = z.object({
  name: z.string().min(2).max(120),
  role: z.string().min(2).max(120),
  bio: z.string().min(20).max(1500),
  avatar_url: z.string().url().or(z.string().regex(/^\/uploads\/.+/)),
  specialties: z.array(z.string().min(1).max(60)).min(1).max(20),
  github_url: z.string().url().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  highlights: z.array(z.string().min(1).max(180)).max(20).optional(),
  account_email: z.string().email().optional().or(z.literal('')),
  account_password: z
    .string()
    .min(8)
    .max(120)
    .refine((value) => value.length === 0 || isStrongPassword(value), passwordPolicyMessage())
    .optional()
    .or(z.literal('')),
  access_role: z.enum(['admin', 'editor', 'member_manager', 'member']).optional(),
})
