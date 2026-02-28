type RedisCommandValue = string | number

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

export function isRedisEnabled() {
  return Boolean(getRedisConfig())
}

async function runRedisCommand(command: RedisCommandValue[]) {
  const config = getRedisConfig()
  if (!config) return null
  const response = await fetch(`${config.url}/${command.map((part) => encodeURIComponent(String(part))).join('/')}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Redis request failed with status ${response.status}`)
  }
  const payload = (await response.json()) as { result?: unknown }
  return payload.result ?? null
}

export async function redisGet(key: string) {
  const value = await runRedisCommand(['GET', key])
  if (value == null) return null
  return String(value)
}

export async function redisSetEx(key: string, ttlSeconds: number, value: string) {
  await runRedisCommand(['SETEX', key, ttlSeconds, value])
}

export async function redisDel(key: string) {
  await runRedisCommand(['DEL', key])
}

export async function redisIncr(key: string) {
  const value = await runRedisCommand(['INCR', key])
  return Number(value ?? 0)
}

export async function redisExpire(key: string, ttlSeconds: number) {
  await runRedisCommand(['EXPIRE', key, ttlSeconds])
}

export async function redisLpush(key: string, value: string) {
  const result = await runRedisCommand(['LPUSH', key, value])
  return Number(result ?? 0)
}

export async function redisRpop(key: string) {
  const result = await runRedisCommand(['RPOP', key])
  return result == null ? null : String(result)
}
