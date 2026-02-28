import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MemberManagePanel from '@/components/member/MemberManagePanel'
import { getSessionFromCookiesAsync } from '@/lib/session'

export default async function MemberManagePage() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)

  if (!session) {
    redirect('/login')
  }

  return <MemberManagePanel />
}
