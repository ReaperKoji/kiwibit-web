import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN
const isProd = process.env.NODE_ENV === 'production'
if (dsn && isProd) {
  Sentry.init({
    dsn,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.2'),
    environment: process.env.NODE_ENV,
  })
}
