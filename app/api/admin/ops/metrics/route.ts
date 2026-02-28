import { NextResponse } from 'next/server'
import { requireAnyRole } from '@/lib/api-guards'
import { createApiRequestContext, getApiObservabilitySnapshot, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'

export async function GET(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    const checked = await requireAnyRole(request, 'admin-ops-metrics', 120, ['admin', 'member_manager'])
    if ('response' in checked) return withRequestId(ctx, checked.response)
    const endpoints = getApiObservabilitySnapshot()
    const totals = endpoints.reduce(
      (acc, item) => ({
        requests: acc.requests + item.count,
        errors: acc.errors + item.errors,
        validationRejected: acc.validationRejected + item.validationRejected,
      }),
      { requests: 0, errors: 0, validationRejected: 0 }
    )
    return withRequestId(ctx, NextResponse.json({ totals, endpoints }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load ops metrics')
  }
}
