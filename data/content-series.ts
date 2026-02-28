export type ContentSeries = {
  id: string
  name: string
  description: string
  tags: string[]
  difficulty: 'starter' | 'intermediate' | 'advanced'
}

export const CONTENT_SERIES: ContentSeries[] = [
  {
    id: 'incident-response-bootcamp',
    name: 'Incident Response Bootcamp',
    description: 'From detection to containment and postmortem in practical steps.',
    tags: ['incident-response', 'forensics', 'playbook'],
    difficulty: 'starter',
  },
  {
    id: 'zero-trust-track',
    name: 'Zero Trust Architecture Track',
    description: 'Identity, policy, segmentation, and secure service-to-service patterns.',
    tags: ['zero-trust', 'architecture', 'security'],
    difficulty: 'intermediate',
  },
  {
    id: 'red-team-lab',
    name: 'Red Team Lab',
    description: 'Offensive simulations, methodology, and defensive lessons learned.',
    tags: ['red-team', 'offensive-security', 'detection'],
    difficulty: 'advanced',
  },
]
