import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma__: PrismaClient | undefined
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma
}

export function isDatabaseEnabled() {
  return Boolean(process.env.DATABASE_URL)
}

export function isDatabaseStrict() {
  const value = process.env.DB_STRICT?.toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}
