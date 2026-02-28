type MetricName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'

const budgets: Record<MetricName, number> = {
  LCP: 2500,
  CLS: 0.1,
  INP: 200,
  FCP: 1800,
  TTFB: 800,
}

const coolDownWindowMs = 5 * 60 * 1000
const lastAlertByKey = new Map<string, number>()

export function isWebVitalBudgetExceeded(metric: MetricName, value: number) {
  return value > budgets[metric]
}

export function getWebVitalBudget(metric: MetricName) {
  return budgets[metric]
}

export function shouldEmitWebVitalAlert(key: string, now = Date.now()) {
  const last = lastAlertByKey.get(key) ?? 0
  if (now - last < coolDownWindowMs) return false
  lastAlertByKey.set(key, now)
  return true
}
