import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export type ApiRequestContext = {
  requestId: string
  traceId: string
  path: string
  method: string
  startedAt: number
}

type EndpointMetric = {
  count: number
  errors: number
  validationRejected: number
  durations: number[]
}

const MAX_SAMPLES = 500
const endpointMetrics = new Map<string, EndpointMetric>()

function endpointKey(ctx: ApiRequestContext) {
  return `${ctx.method} ${ctx.path}`
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function recordMetric(ctx: ApiRequestContext, status: number) {
  const key = endpointKey(ctx)
  const elapsedMs = Date.now() - ctx.startedAt
  const current = endpointMetrics.get(key) ?? { count: 0, errors: 0, validationRejected: 0, durations: [] }
  current.count += 1
  if (status >= 500) current.errors += 1
  if (status === 400) current.validationRejected += 1
  current.durations.push(elapsedMs)
  if (current.durations.length > MAX_SAMPLES) {
    current.durations.splice(0, current.durations.length - MAX_SAMPLES)
  }
  endpointMetrics.set(key, current)
}

export function getApiObservabilitySnapshot() {
  const endpoints = Array.from(endpointMetrics.entries()).map(([key, value]) => ({
    endpoint: key,
    count: value.count,
    errors: value.errors,
    validationRejected: value.validationRejected,
    errorRatePercent: value.count > 0 ? Number(((value.errors / value.count) * 100).toFixed(2)) : 0,
    p95Ms: percentile(value.durations, 95),
    p99Ms: percentile(value.durations, 99),
  }))
  return endpoints.sort((a, b) => b.errors - a.errors || b.p99Ms - a.p99Ms)
}

export function createApiRequestContext(request: Request): ApiRequestContext {
  const incoming = request.headers.get('x-request-id')
  const requestId = incoming && incoming.trim().length > 0 ? incoming : crypto.randomUUID()
  const traceId = request.headers.get('x-trace-id')?.trim() || crypto.randomUUID().replace(/-/g, '')
  const { pathname } = new URL(request.url)
  return {
    requestId,
    traceId,
    path: pathname,
    method: request.method,
    startedAt: Date.now(),
  }
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Unknown error',
  }
}

export function logApiError(ctx: ApiRequestContext, error: unknown, meta?: Record<string, unknown>) {
  const elapsedMs = Date.now() - ctx.startedAt
  const normalized = normalizeError(error)
  recordMetric(ctx, 500)
  Sentry.captureException(error, {
    tags: {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      path: ctx.path,
      method: ctx.method,
    },
    extra: {
      elapsedMs,
      meta,
    },
  })
  console.error(
    JSON.stringify({
      level: 'error',
      scope: 'api',
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      path: ctx.path,
      method: ctx.method,
      elapsedMs,
      error: normalized,
      meta,
      at: new Date().toISOString(),
    })
  )
}

export function withRequestId<T extends NextResponse>(ctx: ApiRequestContext, response: T): T {
  recordMetric(ctx, response.status)
  response.headers.set('x-request-id', ctx.requestId)
  response.headers.set('x-trace-id', ctx.traceId)
  return response
}

export function jsonApiError(
  ctx: ApiRequestContext,
  status: number,
  message: string,
  extra?: Record<string, unknown>
) {
  return withRequestId(ctx, NextResponse.json({ error: message, requestId: ctx.requestId, ...extra }, { status }))
}
