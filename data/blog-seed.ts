export type BlogPostStatus = 'draft' | 'in_review' | 'published' | 'scheduled'

export type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  coverImage: string
  authorId: string
  tags: string[]
  categories: string[]
  status: BlogPostStatus
  featured: boolean
  createdAt: string
  updatedAt: string
  publishedAt?: string
  scheduledFor?: string
  draftContent: string
  publishedContent?: string
}

function nowIso() {
  return new Date().toISOString()
}

export const BLOG_SEED_POSTS: BlogPost[] = [
  {
    id: 'post-001',
    slug: 'zero-trust-blueprint-2026',
    title: 'Zero-Trust Blueprint for Hybrid Teams in 2026',
    excerpt: 'How to map identities, devices, and service boundaries without creating operational drag.',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1400&auto=format&fit=crop',
    authorId: 'gustavo-costa',
    tags: ['zero-trust', 'security-architecture', 'hybrid-work'],
    categories: ['Architecture'],
    status: 'published',
    featured: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: nowIso(),
    draftContent: `## Why zero-trust now
Hybrid teams changed the security boundary. Your trust model must treat every request as external.

## Practical rollout
- Inventory identities and machine principals
- Enforce short-lived credentials
- Segment internal services by risk profile

### KPI to track
Track failed authorization attempts and policy drift per team.`,
    publishedContent: `## Why zero-trust now
Hybrid teams changed the security boundary. Your trust model must treat every request as external.

## Practical rollout
- Inventory identities and machine principals
- Enforce short-lived credentials
- Segment internal services by risk profile

### KPI to track
Track failed authorization attempts and policy drift per team.`,
  },
  {
    id: 'post-002',
    slug: 'incident-response-playbook-lite',
    title: 'Incident Response Playbook Lite for Small Security Teams',
    excerpt: 'A pragmatic playbook for triage, containment, and post-incident learning in under 5 pages.',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1400&auto=format&fit=crop',
    authorId: 'pedro-galvao',
    tags: ['incident-response', 'soc', 'operations'],
    categories: ['Operations'],
    status: 'published',
    featured: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: nowIso(),
    draftContent: `## Triage first
Create clear severity criteria and ownership matrix.

## Containment
Contain quickly with reversible controls.

## Postmortem
Capture timeline, root causes, and preventive controls.`,
    publishedContent: `## Triage first
Create clear severity criteria and ownership matrix.

## Containment
Contain quickly with reversible controls.

## Postmortem
Capture timeline, root causes, and preventive controls.`,
  },
  {
    id: 'post-003',
    slug: 'api-hardening-checklist',
    title: 'API Hardening Checklist for Production Teams',
    excerpt: 'Minimal checklist that catches most critical API issues before deployment.',
    coverImage: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=1400&auto=format&fit=crop',
    authorId: 'marcio-souza',
    tags: ['api-security', 'owasp', 'checklist'],
    categories: ['Engineering'],
    status: 'draft',
    featured: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    draftContent: `## Core controls
- AuthN and AuthZ separation
- Input validation and output encoding
- Rate limiting and abuse detection

## Logging
Structured logs with request correlation IDs.`,
  },
]
