import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import BlogAdminPanel from '@/components/blog/BlogAdminPanel'
import { getSessionFromCookiesAsync } from '@/lib/session'

export default async function AdminContentPage() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookiesAsync(cookieStore)
  if (!session) {
    redirect('/login')
  }
  if (session.role !== 'admin' && session.role !== 'editor') {
    redirect('/member/manage')
  }
  return <BlogAdminPanel />
}
