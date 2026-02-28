import { createHash, randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { isDatabaseEnabled, isDatabaseStrict, prisma } from '@/lib/prisma'

type SubscriberStatus = 'pending' | 'confirmed'

type Subscriber = {
  id: string
  email: string
  token: string
  status: SubscriberStatus
  createdAt: string
  confirmedAt?: string
}

type Store = {
  subscribers: Subscriber[]
}

const NEWSLETTER_PATH = path.join(process.cwd(), 'data', 'newsletter-subscribers.json')

function createToken(email: string) {
  const seed = `${email}:${Date.now()}:${randomUUID()}`
  return createHash('sha256').update(seed).digest('hex')
}

async function readStore(): Promise<Store> {
  if (isDatabaseStrict()) {
    throw new Error('DB_STRICT is enabled but DATABASE_URL is not configured')
  }
  try {
    const raw = await fs.readFile(NEWSLETTER_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Store
    if (!Array.isArray(parsed.subscribers)) return { subscribers: [] }
    return parsed
  } catch {
    return { subscribers: [] }
  }
}

async function writeStore(data: Store) {
  await fs.writeFile(NEWSLETTER_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export async function createPendingSubscriber(email: string) {
  if (isDatabaseEnabled()) {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (existing) {
      if (existing.status === 'confirmed' || existing.status === 'pending') {
        return {
          id: existing.id,
          email: existing.email,
          token: existing.token,
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
          confirmedAt: existing.confirmedAt?.toISOString(),
        }
      }
    }

    const created = await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        token: createToken(email),
        status: 'pending',
      },
    })
    return {
      id: created.id,
      email: created.email,
      token: created.token,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    }
  }

  const store = await readStore()
  const existing = store.subscribers.find((item) => item.email.toLowerCase() === email.toLowerCase())
  if (existing?.status === 'confirmed') return existing
  if (existing?.status === 'pending') return existing

  const created: Subscriber = {
    id: randomUUID(),
    email,
    token: createToken(email),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  store.subscribers.push(created)
  await writeStore(store)
  return created
}

export async function confirmSubscriberByToken(token: string) {
  if (isDatabaseEnabled()) {
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { token },
    })
    if (!existing) return null
    const updated = await prisma.newsletterSubscriber.update({
      where: { token },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    })
    return {
      id: updated.id,
      email: updated.email,
      token: updated.token,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      confirmedAt: updated.confirmedAt?.toISOString(),
    }
  }

  const store = await readStore()
  const item = store.subscribers.find((subscriber) => subscriber.token === token)
  if (!item) return null
  item.status = 'confirmed'
  item.confirmedAt = new Date().toISOString()
  await writeStore(store)
  return item
}
