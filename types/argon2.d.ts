declare module 'argon2' {
  export const argon2id: unknown
  export function hash(password: string, options?: Record<string, unknown>): Promise<string>
  export function verify(digest: string, password: string): Promise<boolean>
}
