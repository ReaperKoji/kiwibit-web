import { Prisma } from '@prisma/client'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'
import { listPublishedPosts } from '@/lib/blog-store'
import { cacheGetJson, cacheSetJson } from '@/lib/distributed-cache'
import { isFeatureEnabled } from '@/lib/feature-flags'

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

type EmbeddingSearchResult = {
  slug: string
  title: string
  excerpt: string
  score: number
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.map((value) => Number(value.toFixed(8))).join(',')}]`
}

async function fetchOpenAIEmbedding(text: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  })
  if (!response.ok) {
    return null
  }
  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>
  }
  const embedding = payload.data?.[0]?.embedding
  if (!embedding || !Array.isArray(embedding)) return null
  return embedding
}

function deterministicFallbackEmbedding(text: string) {
  const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0)
  for (let i = 0; i < text.length; i += 1) {
    const idx = i % EMBEDDING_DIMENSIONS
    vector[idx] += text.charCodeAt(i) / 255
  }
  const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0)) || 1
  return vector.map((value) => value / norm)
}

async function getEmbedding(text: string) {
  const cacheKey = `embedding:${text.slice(0, 200)}`
  const cached = await cacheGetJson<number[]>(cacheKey)
  if (cached) return cached
  const remote = await fetchOpenAIEmbedding(text)
  const embedding = remote ?? deterministicFallbackEmbedding(text)
  await cacheSetJson(cacheKey, embedding, 60 * 60 * 24)
  return embedding
}

export async function reindexBlogEmbeddings(limit = 80) {
  if (!isDatabaseEnabled()) return { indexed: 0 }
  const enabled = await isFeatureEnabled('semantic_embeddings')
  if (!enabled) return { indexed: 0 }

  const listing = await listPublishedPosts({ page: 1, pageSize: limit })
  let indexed = 0
  for (const post of listing.items) {
    const content = `${post.title}\n${post.excerpt}\n${post.tags.join(' ')}\n${post.categories.join(' ')}\n${post.publishedContent ?? post.draftContent}`
    const vector = await getEmbedding(content)
    const literal = toVectorLiteral(vector)
    await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "BlogEmbedding" ("id", "postId", "model", "dimensions", "vector", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${post.id}, ${EMBEDDING_MODEL}, ${EMBEDDING_DIMENSIONS}, ${literal}::vector, NOW())
        ON CONFLICT ("postId")
        DO UPDATE SET "model" = EXCLUDED."model", "dimensions" = EXCLUDED."dimensions", "vector" = EXCLUDED."vector", "updatedAt" = NOW()
      `
    )
    indexed += 1
  }
  return { indexed }
}

export async function searchByEmbedding(query: string, limit = 8): Promise<EmbeddingSearchResult[]> {
  if (!isDatabaseEnabled()) return []
  const enabled = await isFeatureEnabled('semantic_embeddings')
  if (!enabled) return []

  const vector = await getEmbedding(query)
  const literal = toVectorLiteral(vector)
  const rows = await prisma.$queryRaw<Array<{ slug: string; title: string; excerpt: string; distance: number }>>(
    Prisma.sql`
      SELECT p."slug", p."title", p."excerpt", (e."vector" <=> ${literal}::vector) AS distance
      FROM "BlogEmbedding" e
      JOIN "BlogPost" p ON p."id" = e."postId"
      WHERE p."status" = 'published'
      ORDER BY e."vector" <=> ${literal}::vector
      LIMIT ${limit}
    `
  )

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    score: Number((1 - row.distance).toFixed(4)),
  }))
}
