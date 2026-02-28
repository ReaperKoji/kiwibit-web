export const BLOG_FIXED_CATEGORIES = ['Architecture', 'Operations', 'Engineering', 'Threat Intel', 'Case Study'] as const

export type BlogFixedCategory = (typeof BLOG_FIXED_CATEGORIES)[number]

export const BLOG_ARTICLE_TEMPLATE = `## Intro
Briefly frame the context and why this topic matters now.

## Problem
Describe the concrete security or engineering problem.

## Solution
- Step 1 with practical implementation detail
- Step 2 with tradeoff/risk notes
- Step 3 with measurable outcome

## Conclusion
Summarize the key decisions and expected impact.

## CTA
Invite readers to apply, test, or discuss the approach.`

export const BLOG_EDITORIAL_CALENDAR = [
  { period: 'Week 1', theme: 'Threat Intelligence Brief', focus: 'Emerging vectors, IOCs, and mitigation checklist.' },
  { period: 'Week 2', theme: 'Deep Technical Post', focus: 'Architecture decision, benchmarks, and implementation guide.' },
  { period: 'Week 3', theme: 'Incident Case Study', focus: 'Timeline, root cause, containment, and lessons learned.' },
  { period: 'Week 4', theme: 'Operational Playbook', focus: 'Runbook, SLOs, and automation opportunities.' },
] as const
