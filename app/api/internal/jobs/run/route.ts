import { NextResponse } from 'next/server'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { processOneJob } from '@/lib/job-queue'

function isAuthorized(request: Request) {
  const token = request.headers.get('x-internal-token')
  const secret = process.env.INTERNAL_JOB_TOKEN
  return Boolean(secret && token && token === secret)
}

export async function POST(request: Request) {
  const ctx = createApiRequestContext(request)
  try {
    if (!isAuthorized(request)) {
      return jsonApiError(ctx, 401, 'Unauthorized')
    }
    const result = await processOneJob()
    return withRequestId(ctx, NextResponse.json({ ok: true, result }))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not process queued job')
  }
}
