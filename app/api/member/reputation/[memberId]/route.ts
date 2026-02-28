import { NextResponse } from 'next/server'
import { createApiRequestContext, jsonApiError, logApiError, withRequestId } from '@/lib/api-monitor'
import { getMemberReputation } from '@/lib/member-reputation'

export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const ctx = createApiRequestContext(request)
  try {
    const { memberId } = await params
    const reputation = await getMemberReputation(memberId)
    return withRequestId(ctx, NextResponse.json(reputation))
  } catch (error) {
    logApiError(ctx, error)
    return jsonApiError(ctx, 500, 'Could not load member reputation')
  }
}
