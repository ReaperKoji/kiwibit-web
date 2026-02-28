export type TocItem = {
  id: string
  level: 2 | 3
  title: string
}

export type MarkdownBlock =
  | { type: 'h2'; id: string; text: string }
  | { type: 'h3'; id: string; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function estimateReadingMinutes(markdown: string) {
  const words = markdown.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}

export function parseMarkdown(markdown: string): { toc: TocItem[]; blocks: MarkdownBlock[] } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  const toc: TocItem[] = []

  let listBuffer: string[] = []

  function flushList() {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'ul', items: [...listBuffer] })
      listBuffer = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    if (line.startsWith('## ')) {
      flushList()
      const text = line.slice(3).trim()
      const id = slugify(text)
      toc.push({ id, level: 2, title: text })
      blocks.push({ type: 'h2', id, text })
      continue
    }

    if (line.startsWith('### ')) {
      flushList()
      const text = line.slice(4).trim()
      const id = slugify(text)
      toc.push({ id, level: 3, title: text })
      blocks.push({ type: 'h3', id, text })
      continue
    }

    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2).trim())
      continue
    }

    flushList()
    blocks.push({ type: 'p', text: line })
  }

  flushList()
  return { toc, blocks }
}
