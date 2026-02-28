import { createHash } from 'crypto'
import { isRedisEnabled, redisGet, redisSetEx } from '@/lib/redis'

function stableKey(key: string) {
  return `cache:${createHash('sha256').update(key).digest('hex')}`
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  if (!isRedisEnabled()) return null
  const raw = await redisGet(stableKey(key))
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function cacheSetJson<T>(key: string, value: T, ttlSeconds = 300) {
  if (!isRedisEnabled()) return
  await redisSetEx(stableKey(key), ttlSeconds, JSON.stringify(value))
}
