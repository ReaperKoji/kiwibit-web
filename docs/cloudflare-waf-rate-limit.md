# Cloudflare WAF and Edge Rate-Limit

Apply WAF + rate-limits for public endpoints:

Protected routes:

1. `/api/blog/analytics/track`
2. `/api/blog/analytics/performance`
3. `/api/blog/comments`
4. `/api/blog/search/semantic`
5. `/api/activity/feed`

Recommended rules:

1. Block known bots and threat score > medium.
2. Challenge countries not in primary audience (optional).
3. Rate limit by IP:
   `/api/blog/comments`: 20 req / 1 min
   `/api/blog/search/semantic`: 60 req / 1 min
   analytics endpoints: 180 req / 1 min
4. Require managed challenge on suspicious user-agents.
5. Enable bot fight mode and API shield for these routes.

Observability:

1. Export WAF events to SIEM.
2. Alert when block/challenge spikes > 3x baseline.
3. Correlate Cloudflare Ray ID with `x-request-id` in app logs.
