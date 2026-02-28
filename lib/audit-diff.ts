function stableJson(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function buildFieldDiff(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
) {
  const beforeSafe = before ?? {}
  const afterSafe = after ?? {}
  const keys = new Set<string>([...Object.keys(beforeSafe), ...Object.keys(afterSafe)])
  const changed: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of keys) {
    const prev = beforeSafe[key]
    const next = afterSafe[key]
    if (stableJson(prev) !== stableJson(next)) {
      changed[key] = { before: prev, after: next }
    }
  }
  return changed
}
