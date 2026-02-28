import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-guards'
import { listPendingMembers } from '@/lib/pending-members'

export async function GET(request: Request) {
  const checked = await requireAdmin(request, 'member-pending', 120)
  if ('response' in checked) return checked.response
  const pending = await listPendingMembers()
  return NextResponse.json({ pending })
}
