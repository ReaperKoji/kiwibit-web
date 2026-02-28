export const PILLAR_TOPICS = ['cyber', 'devsecops', 'incident-response'] as const

export type PillarTopic = (typeof PILLAR_TOPICS)[number]

export const PILLAR_COPY: Record<PillarTopic, { title: string; description: string; keywords: string[] }> = {
  cyber: {
    title: 'Cybersecurity Pillar',
    description: 'Threat-informed defense, architecture controls and offensive lessons.',
    keywords: ['security', 'cyber', 'red-team', 'threat'],
  },
  devsecops: {
    title: 'DevSecOps Pillar',
    description: 'Secure SDLC, automation, policy-as-code and runtime hardening.',
    keywords: ['devsecops', 'ci', 'pipeline', 'supply-chain'],
  },
  'incident-response': {
    title: 'Incident Response Pillar',
    description: 'Detection, triage, containment and recovery playbooks.',
    keywords: ['incident', 'response', 'forensics', 'playbook'],
  },
}
