import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MemberAdminPanel from '@/components/member/MemberAdminPanel'
import { getSessionFromCookiesAsync } from '@/lib/session'

export default async function AdminMembersPage() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  if (!session) {
    redirect('/login')
  }
  if (session.role !== 'admin' && session.role !== 'member_manager') {
    redirect('/member/manage')
  }
  return <MemberAdminPanel />
}
