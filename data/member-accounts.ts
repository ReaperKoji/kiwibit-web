export type MemberAccount = {
  memberId: string
  email: string
  password: string
  role: 'member' | 'admin' | 'editor' | 'member_manager'
}

export const MEMBER_ACCOUNTS: MemberAccount[] = [
  { memberId: 'gustavo-costa', email: 'gustavo@kiwibit.com', password: 'kiwi1234', role: 'admin' },
  { memberId: 'pedro-galvao', email: 'pedro.galvao@kiwibit.com', password: 'kiwi1234', role: 'member' },
  { memberId: 'marcio-souza', email: 'marcio@kiwibit.com', password: 'kiwi1234', role: 'member' },
  { memberId: 'pedro-souza', email: 'pedro.souza@kiwibit.com', password: 'kiwi1234', role: 'member' },
  { memberId: 'thiago-maia', email: 'thiago@kiwibit.com', password: 'kiwi1234', role: 'member' },
  { memberId: 'henrique', email: 'henrique@kiwibit.com', password: 'kiwi1234', role: 'member' },
  { memberId: 'italo-bianchi', email: 'italo@kiwibit.com', password: 'kiwi1234', role: 'member' },
]

export function findAccountByEmail(email: string) {
  return MEMBER_ACCOUNTS.find((item) => item.email.toLowerCase() === email.toLowerCase())
}
