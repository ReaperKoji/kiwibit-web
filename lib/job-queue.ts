import { redisLpush, redisRpop } from '@/lib/redis'
import { reindexBlogEmbeddings } from '@/lib/embeddings'
import { upsertMailchimpSubscriber } from '@/lib/newsletter-delivery'
import { getGrowthMetrics } from '@/lib/growth-metrics'

export type QueueJob =
  | { type: 'embeddings_reindex' }
  | { type: 'newsletter_sync'; email: string }
  | { type: 'growth_rollup' }
  | { type: 'github_sync'; memberId?: string }

const QUEUE_KEY = 'kb:jobs:default'

export async function enqueueJob(job: QueueJob) {
  await redisLpush(QUEUE_KEY, JSON.stringify(job))
}

export async function processOneJob() {
  const raw = await redisRpop(QUEUE_KEY)
  if (!raw) return { processed: false as const }
  const job = JSON.parse(raw) as QueueJob
  if (job.type === 'embeddings_reindex') {
    const result = await reindexBlogEmbeddings()
    return { processed: true as const, job, result }
  }
  if (job.type === 'newsletter_sync') {
    const result = await upsertMailchimpSubscriber(job.email)
    return { processed: true as const, job, result }
  }
  if (job.type === 'growth_rollup') {
    const result = await getGrowthMetrics()
    return { processed: true as const, job, result: { retention: result.retentionRatePercent } }
  }
  if (job.type === 'github_sync') {
    return { processed: true as const, job, result: { ok: true } }
  }
  return { processed: true as const, job, result: { skipped: true } }
}
