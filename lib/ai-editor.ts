import { listPublishedPosts } from '@/lib/blog-store'
import { isFeatureEnabled } from '@/lib/feature-flags'

export type EditorAssistInput = {
  draftContent: string
  currentTitle?: string
  currentExcerpt?: string
}

function cleanLine(value: string) {
  return value.replace(/^#+\s*/, '').trim()
}

function extractFirstHeading(markdown: string) {
  const heading = markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('#'))
  return heading ? cleanLine(heading) : ''
}

function extractSummary(markdown: string) {
  const paragraph = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 20 && !line.startsWith('#') && !line.startsWith('- '))[0]
  return (paragraph ?? '').slice(0, 280)
}

function scoreSeo(input: { title: string; excerpt: string; content: string }) {
  let score = 0
  if (input.title.length >= 40 && input.title.length <= 70) score += 30
  else if (input.title.length >= 20) score += 18
  if (input.excerpt.length >= 120 && input.excerpt.length <= 170) score += 25
  else if (input.excerpt.length >= 80) score += 16
  if (/##\s+/g.test(input.content)) score += 15
  if ((input.content.match(/\n##\s+/g) ?? []).length >= 3) score += 10
  if ((input.content.match(/\[.+\]\(.+\)/g) ?? []).length >= 2) score += 10
  if (input.content.length > 1800) score += 10
  return Math.min(100, score)
}

function extractKeywords(text: string) {
  const stop = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'you', 'your', 'uma', 'para', 'com', 'como'])
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
  const counts = new Map<string, number>()
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word)
}

export async function suggestEditorImprovements(input: EditorAssistInput) {
  const title = input.currentTitle?.trim() || extractFirstHeading(input.draftContent) || 'Security Engineering Playbook'
  const excerpt = input.currentExcerpt?.trim() || extractSummary(input.draftContent)
  const keywords = extractKeywords(`${title} ${excerpt} ${input.draftContent}`)
  const seoScore = scoreSeo({ title, excerpt, content: input.draftContent })

  const listing = await listPublishedPosts({ page: 1, pageSize: 60 })
  const internalLinks = listing.items
    .map((post) => {
      const text = `${post.title} ${post.excerpt}`.toLowerCase()
      const overlap = keywords.filter((kw) => text.includes(kw)).length
      return { slug: post.slug, title: post.title, overlap }
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)

  const base = {
    suggestedTitle: title,
    suggestedExcerpt: excerpt,
    seoScore,
    keywords,
    internalLinks,
    checklist: {
      hasIntro: input.draftContent.includes('## Intro'),
      hasProblem: input.draftContent.includes('## Problem'),
      hasSolution: input.draftContent.includes('## Solution'),
      hasConclusion: input.draftContent.includes('## Conclusion'),
      hasCTA: input.draftContent.includes('## CTA'),
    },
  }

  const useOpenAI = await isFeatureEnabled('ai_editor_openai')
  const apiKey = process.env.OPENAI_API_KEY
  if (!useOpenAI || !apiKey) return base

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EDITOR_MODEL ?? 'gpt-4o-mini',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an SEO and editorial assistant. Return strict JSON with: suggestedTitle, suggestedExcerpt, tone, seoNotes.',
          },
          {
            role: 'user',
            content: `Title: ${title}\nExcerpt: ${excerpt}\nDraft:\n${input.draftContent.slice(0, 12000)}`,
          },
        ],
      }),
    })
    if (!response.ok) return base
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content
    if (!content) return base
    const parsed = JSON.parse(content) as {
      suggestedTitle?: string
      suggestedExcerpt?: string
      seoNotes?: string
    }
    return {
      ...base,
      suggestedTitle: parsed.suggestedTitle?.slice(0, 180) || base.suggestedTitle,
      suggestedExcerpt: parsed.suggestedExcerpt?.slice(0, 320) || base.suggestedExcerpt,
      keywords: parsed.seoNotes ? Array.from(new Set([...base.keywords, ...extractKeywords(parsed.seoNotes)])) : base.keywords,
    }
  } catch {
    return base
  }
}
