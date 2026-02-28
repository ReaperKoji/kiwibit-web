import { listAllPostsForAdmin } from '@/lib/blog-store'
import { parseMarkdown } from '@/lib/markdown'

type SeoGapRow = {
  slug: string
  title: string
  status: string
  wordCount: number
  seoScore: number
  gaps: string[]
}

type CoverageRow = {
  topic: string
  totalPosts: number
}

export type SeoGapReport = {
  generatedAt: string
  thinContentCount: number
  missingTemplateCount: number
  noInternalLinkCount: number
  rows: SeoGapRow[]
  coverage: CoverageRow[]
}

const templateSections = ['intro', 'problem', 'solution', 'conclusion', 'cta']

function scoreSeo(title: string, excerpt: string, words: number, gaps: string[]) {
  let score = 100
  if (title.length < 25 || title.length > 65) score -= 10
  if (excerpt.length < 120 || excerpt.length > 170) score -= 10
  if (words < 700) score -= 20
  score -= gaps.length * 8
  return Math.max(0, score)
}

export async function buildSeoGapReport(): Promise<SeoGapReport> {
  const posts = await listAllPostsForAdmin()
  const published = posts.filter((post) => post.status === 'published')
  const slugs = new Set(published.map((post) => post.slug))

  const rows: SeoGapRow[] = published.map((post) => {
    const markdown = post.publishedContent ?? post.draftContent
    const plain = markdown.replace(/[>#*_`-]/g, ' ').replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim()
    const words = plain.length === 0 ? 0 : plain.split(' ').length
    const parsed = parseMarkdown(markdown)
    const headingSet = new Set(parsed.toc.map((item) => item.title.toLowerCase()))
    const gaps: string[] = []

    if (words < 700) gaps.push('Conteudo fino (<700 palavras)')
    if (post.tags.length < 2) gaps.push('Poucas tags (min 2)')
    if (post.categories.length < 1) gaps.push('Sem categoria')

    const missingSections = templateSections.filter((section) => !headingSet.has(section))
    if (missingSections.length > 0) gaps.push(`Template incompleto: ${missingSections.join(', ')}`)

    const internalLinkRegex = /\/blog\/([a-z0-9-]+)/g
    const linkedSlugs = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = internalLinkRegex.exec(markdown)) !== null) {
      linkedSlugs.add(match[1])
    }
    const validInternalLinks = [...linkedSlugs].filter((slug) => slugs.has(slug) && slug !== post.slug)
    if (validInternalLinks.length === 0) gaps.push('Sem links internos para outros posts')

    const seoScore = scoreSeo(post.title, post.excerpt, words, gaps)

    return {
      slug: post.slug,
      title: post.title,
      status: post.status,
      wordCount: words,
      seoScore,
      gaps,
    }
  })

  const coverageMap = new Map<string, number>()
  for (const post of published) {
    for (const category of post.categories) {
      coverageMap.set(category, (coverageMap.get(category) ?? 0) + 1)
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    thinContentCount: rows.filter((row) => row.wordCount < 700).length,
    missingTemplateCount: rows.filter((row) => row.gaps.some((gap) => gap.includes('Template incompleto'))).length,
    noInternalLinkCount: rows.filter((row) => row.gaps.some((gap) => gap.includes('Sem links internos'))).length,
    rows: rows.sort((a, b) => a.seoScore - b.seoScore || a.wordCount - b.wordCount).slice(0, 30),
    coverage: [...coverageMap.entries()]
      .map(([topic, totalPosts]) => ({ topic, totalPosts }))
      .sort((a, b) => b.totalPosts - a.totalPosts),
  }
}
