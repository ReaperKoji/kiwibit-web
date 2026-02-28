import { listPublishedPosts } from '@/lib/blog-store'
import { searchByEmbedding } from '@/lib/embeddings'

type SemanticDoc = {
  slug: string
  title: string
  excerpt: string
  content: string
  tags: string[]
  categories: string[]
}

type ScoredDoc = SemanticDoc & {
  score: number
  matchedTerms: string[]
  context: string
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function tf(tokens: string[]) {
  const map = new Map<string, number>()
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1)
  }
  const total = tokens.length || 1
  const out = new Map<string, number>()
  for (const [key, value] of map.entries()) {
    out.set(key, value / total)
  }
  return out
}

function cosine(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0
  let normA = 0
  let normB = 0
  const keys = new Set<string>([...a.keys(), ...b.keys()])
  for (const key of keys) {
    const av = a.get(key) ?? 0
    const bv = b.get(key) ?? 0
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function extractContext(content: string, terms: string[]) {
  const lower = content.toLowerCase()
  const index = terms
    .map((term) => lower.indexOf(term))
    .filter((value) => value >= 0)
    .sort((a, b) => a - b)[0]
  if (index === undefined) {
    return content.slice(0, 220)
  }
  const start = Math.max(0, index - 90)
  const end = Math.min(content.length, index + 180)
  return content.slice(start, end)
}

export async function semanticSearchPosts(query: string, limit = 6) {
  const q = query.trim()
  if (!q) return [] as ScoredDoc[]

  const embeddingResults = await searchByEmbedding(q, limit)
  if (embeddingResults.length > 0) {
    return embeddingResults.map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      content: `${item.title}\n${item.excerpt}`,
      tags: [],
      categories: [],
      score: item.score,
      matchedTerms: [],
      context: item.excerpt,
    }))
  }

  const listing = await listPublishedPosts({ page: 1, pageSize: 80 })
  const docs: SemanticDoc[] = listing.items.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: `${post.title}\n${post.excerpt}\n${post.tags.join(' ')}\n${post.categories.join(' ')}\n${post.publishedContent ?? post.draftContent}`,
    tags: post.tags,
    categories: post.categories,
  }))

  const queryTokens = tokenize(q)
  const queryVec = tf(queryTokens)
  const scored = docs
    .map((doc) => {
      const docTokens = tokenize(doc.content)
      const docVec = tf(docTokens)
      const semantic = cosine(queryVec, docVec)
      const matchedTerms = queryTokens.filter((token) => doc.content.toLowerCase().includes(token))
      const lexicalBoost = matchedTerms.length / Math.max(1, queryTokens.length)
      const score = Number((semantic * 0.75 + lexicalBoost * 0.25).toFixed(4))
      return {
        ...doc,
        score,
        matchedTerms,
        context: extractContext(doc.content, matchedTerms.length > 0 ? matchedTerms : queryTokens),
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  return scored
}

export function buildRagAnswer(question: string, docs: ScoredDoc[]) {
  if (docs.length === 0) {
    return {
      summary: 'No strong contextual matches were found yet for this query.',
      citations: [] as string[],
    }
  }
  const top = docs.slice(0, 3)
  const summary = [
    `Question: ${question}`,
    'Context-based answer:',
    ...top.map((doc, index) => `${index + 1}. ${doc.title} -> ${doc.context}`),
  ].join('\n')
  return {
    summary,
    citations: top.map((doc) => `/blog/${doc.slug}`),
  }
}
