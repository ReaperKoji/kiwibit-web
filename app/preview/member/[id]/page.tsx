import { notFound } from 'next/navigation'
import MemberPanel from '@/components/member/MemberPanel'
import { MEMBER_IDS } from '@/data/members'
import { getDraftMemberById } from '@/lib/member-store'
import { verifyPreviewToken } from '@/lib/preview-token'

type PreviewPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function MemberPreviewPage({ params, searchParams }: PreviewPageProps) {
  const { id } = await params
  const query = await searchParams

  if (!MEMBER_IDS.includes(id)) {
    notFound()
  }

  const tokenData = verifyPreviewToken(query.token ?? null)
  if (!tokenData || tokenData.memberId !== id) {
    notFound()
  }

  const member = await getDraftMemberById(id)
  if (!member) {
    notFound()
  }

  return <MemberPanel initialMemberId={id} initialMemberData={member} />
}
