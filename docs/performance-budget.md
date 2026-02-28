# Performance Budget (Critical Routes)

Scope:
- `/`
- `/blog`
- `/team`
- `/member/[slug]`

Targets (mobile-first):
- LCP: <= 2.5s
- INP: <= 200ms
- CLS: <= 0.10
- TTFB: <= 0.8s
- First load JS (route-level target): <= 180KB compressed

Operational commands:
- Baseline in CI/local:
  - `npm run perf:baseline`
- Critical route warmup:
  - `npm run warmup:critical`

Guardrails:
- Lighthouse budget is enforced in CI via `.lighthouserc.json`.
- Web Vitals regressions are tracked via `/api/blog/analytics/performance`.
- Alerts are emitted through `OPS_ALERT_WEBHOOK_URL` or `SLACK_WEBHOOK_URL` when metric budgets are exceeded.
