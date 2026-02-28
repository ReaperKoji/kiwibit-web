const TAG_PATTERN = /<[^>]*>/g

export function sanitizeText(value: string, maxLength?: number) {
  const collapsed = value.replace(/\r\n/g, '\n').replace(TAG_PATTERN, '').replace(/[^\S\n]+/g, ' ').trim()
  if (typeof maxLength === 'number' && maxLength > 0) {
    return collapsed.slice(0, maxLength)
  }
  return collapsed
}

export function sanitizeMarkdown(value: string, maxLength?: number) {
  const cleaned = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/\r\n/g, '\n').trim()
  if (typeof maxLength === 'number' && maxLength > 0) {
    return cleaned.slice(0, maxLength)
  }
  return cleaned
}

export function sanitizeStringArray(items: string[], maxItemLength = 40) {
  return items
    .map((item) => sanitizeText(item, maxItemLength))
    .filter(Boolean)
}
