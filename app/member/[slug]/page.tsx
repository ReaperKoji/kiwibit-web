import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MemberPanel from '@/components/member/MemberPanel'
import { MEMBERS_BY_ID, type Member } from '@/data/members'
import { getPublishedMemberById } from '@/lib/member-store'
import { listDirectoryMembers } from '@/lib/member-directory-store'

const SITE_URL = 'http://localhost:3000'

type PageProps = {
  params: Promise<{ slug: string }>
}

const MEMBER_SLUG_ALIASES: Record<string, string> = {
  pedryn: 'pedro-souza',
  'pedro-henrique': 'pedro-souza',
  'pedro-henrique-souza': 'pedro-souza',
  marcio: 'marcio-souza',
  gustavo: 'gustavo-costa',
  thiago: 'thiago-maia',
}

function normalizeSlug(slug: string) {
  return slug.toLowerCase().trim()
}

async function resolveMemberBySlug(rawSlug: string): Promise<Member | null> {
  const normalized = normalizeSlug(rawSlug)
  const slug = MEMBER_SLUG_ALIASES[normalized] ?? normalized
  const fromStore = await getPublishedMemberById(slug)
  if (fromStore) return fromStore
  return MEMBERS_BY_ID[slug] ?? null
}

export async function generateStaticParams() {
  const members = await listDirectoryMembers()
  return members.map((member) => ({ slug: member.id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  const member = await resolveMemberBySlug(slug)
  if (!member) {
    return {
      title: 'Member Not Found | KIWI BIT',
      description: 'Requested member profile was not found.',
    }
  }
  const title = `${member.realName} | KIWI BIT Member`
  const description = `${member.speciality}. ${member.bio}`
  const canonical = `${SITE_URL}/member/${member.id}`
  const ogImage = `${member.avatar}&w=1200&h=630`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: member.codename,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { slug } = await params

  const member = await resolveMemberBySlug(slug)
  if (!member) notFound()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.realName,
    alternateName: member.codename,
    description: member.bio,
    image: member.avatar,
    jobTitle: member.speciality,
    worksFor: {
      '@type': 'Organization',
      name: 'KIWI BIT',
      url: SITE_URL,
    },
    url: `${SITE_URL}/member/${member.id}`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MemberPanel initialMemberId={member.id} initialMemberData={member} />
    </>
  )
}
