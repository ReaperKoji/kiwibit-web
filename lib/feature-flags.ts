import { isRedisEnabled, redisGet, redisSetEx } from '@/lib/redis'

type FlagKey =
  | 'semantic_admin_panel'
  | 'semantic_embeddings'
  | 'ai_editor_openai'
  | 'activity_feed'
  | 'reputation_ranking'
  | 'warehouse_rollup'
  | 'queue_workers'

const DEFAULT_FLAGS: Record<FlagKey, boolean> = {
  semantic_admin_panel: true,
  semantic_embeddings: false,
  ai_editor_openai: true,
  activity_feed: true,
  reputation_ranking: true,
  warehouse_rollup: true,
  queue_workers: true,
}

function fromEnv(key: FlagKey) {
  const envKey = `FF_${key.toUpperCase()}`
  const raw = process.env[envKey]
  if (!raw) return null
  return raw === '1' || raw.toLowerCase() === 'true'
}

export async function isFeatureEnabled(key: FlagKey) {
  const env = fromEnv(key)
  if (env !== null) return env

  if (isRedisEnabled()) {
    const redisValue = await redisGet(`ff:${key}`)
    if (redisValue != null) {
      return redisValue === '1' || redisValue === 'true'
    }
  }

  return DEFAULT_FLAGS[key]
}

export async function setFeatureFlag(key: FlagKey, value: boolean, ttlSeconds = 60 * 60 * 24 * 7) {
  if (!isRedisEnabled()) return
  await redisSetEx(`ff:${key}`, ttlSeconds, value ? '1' : '0')
}

export type { FlagKey }
