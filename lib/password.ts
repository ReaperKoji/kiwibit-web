import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LEN = 64
const ARGON_PREFIX = '$argon2'

let argon2Loader: Promise<{
  hash: (password: string, options: Record<string, unknown>) => Promise<string>
  verify: (hash: string, password: string) => Promise<boolean>
  argon2id?: unknown
} | null> | null = null

const runtimeImport = new Function('moduleName', 'return import(moduleName)') as (
  moduleName: string
) => Promise<unknown>

async function loadArgon2() {
  if (!argon2Loader) {
    argon2Loader = runtimeImport('argon2')
      .then((mod) => mod as unknown as { hash: (password: string, options: Record<string, unknown>) => Promise<string>; verify: (hash: string, password: string) => Promise<boolean>; argon2id?: unknown })
      .catch(() => null)
  }
  return argon2Loader
}

function hashPasswordLegacy(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex')
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`
}

export async function hashPassword(password: string) {
  const argon2 = await loadArgon2()
  if (argon2) {
    const options: Record<string, unknown> = {
      memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? '19456'),
      timeCost: Number(process.env.ARGON2_TIME_COST ?? '2'),
      parallelism: Number(process.env.ARGON2_PARALLELISM ?? '1'),
    }
    if (argon2.argon2id) {
      options.type = argon2.argon2id
    }
    return argon2.hash(password, options)
  }
  return hashPasswordLegacy(password)
}

export function isHashedPassword(value: string) {
  return value.startsWith('scrypt$') || value.startsWith(ARGON_PREFIX)
}

export async function verifyPassword(password: string, stored: string) {
  if (!isHashedPassword(stored)) {
    return { ok: stored === password, needsRehash: stored === password }
  }

  if (stored.startsWith(ARGON_PREFIX)) {
    const argon2 = await loadArgon2()
    if (!argon2) {
      return { ok: false, needsRehash: false }
    }
    const ok = await argon2.verify(stored, password)
    return { ok, needsRehash: false }
  }

  const parts = stored.split('$')
  if (parts.length !== 6) return { ok: false, needsRehash: false }
  const [, nRaw, rRaw, pRaw, salt, hash] = parts
  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !hash) {
    return { ok: false, needsRehash: false }
  }
  const derived = scryptSync(password, salt, KEY_LEN, { N: n, r, p }).toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(derived, 'hex')
  if (a.length !== b.length) return { ok: false, needsRehash: false }
  const ok = timingSafeEqual(a, b)
  const needsRehash = ok
  return { ok, needsRehash }
}
