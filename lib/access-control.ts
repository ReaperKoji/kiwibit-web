import type { SessionRole } from '@/lib/session'

export function canManageMembers(role: SessionRole) {
  return role === 'admin' || role === 'member_manager'
}

export function canManageContent(role: SessionRole) {
  return role === 'admin' || role === 'editor'
}

export function isAdminRole(role: SessionRole) {
  return role === 'admin'
}
