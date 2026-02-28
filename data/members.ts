export interface Skill {
  name: string
  category: 'technical'
}

export interface MemberProject {
  title: string
  image: string
  href: string
}

export interface Member {
  id: string
  codename: string
  realName: string
  speciality: string
  bio: string
  clearance: string
  avatar: string
  skills: Skill[]
  stack: string[]
  achievements: string[]
  projects: MemberProject[]
  contactEmail: string
}

export interface TeamMemberCard {
  slug: string
  name: string
  role: string
  desc: string
}

function baseProjects(prefix: string): MemberProject[] {
  return [
    {
      title: `${prefix} Platform Build`,
      image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=700&auto=format&fit=crop',
      href: 'https://github.com/',
    },
    {
      title: `${prefix} Security Operations`,
      image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=700&auto=format&fit=crop',
      href: 'https://owasp.org/',
    },
    {
      title: `${prefix} Product Hardening`,
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=700&auto=format&fit=crop',
      href: 'https://nvd.nist.gov/',
    },
  ]
}

export const MEMBERS_BY_ID: Record<string, Member> = {
  'gustavo-costa': {
    id: 'gustavo-costa',
    codename: 'GUSTAVO',
    realName: 'Gustavo Costa',
    speciality: 'Cyber Security Specialist',
    bio: 'Software engineer focused on secure architectures, pentest workflows, and practical hardening for modern web platforms.',
    clearance: 'L-05',
    avatar: 'https://avatars.githubusercontent.com/gustavorodr?size=400',
    skills: [
      { name: 'Kernel Exploitation', category: 'technical' },
      { name: 'C/C++', category: 'technical' },
      { name: 'x64 Assembly', category: 'technical' },
    ],
    stack: ['C/C++', 'Python', 'Linux', 'Burp Suite', 'Ghidra'],
    achievements: ['Led 30+ web security audits', 'Reduced critical findings by 45%', 'Built internal offensive tooling'],
    projects: baseProjects('Offensive'),
    contactEmail: 'gustavo@kiwibit.com',
  },
  'pedro-galvao': {
    id: 'pedro-galvao',
    codename: 'PGALVAO',
    realName: 'Pedro Galvao',
    speciality: 'Systems Analysis',
    bio: 'Systems Analysis and Development student with emphasis on secure coding, network fundamentals, and incident response.',
    clearance: 'L-04',
    avatar: 'https://avatars.githubusercontent.com/ReaperKoji?size=400',
    skills: [
      { name: 'Threat Modeling', category: 'technical' },
      { name: 'SOC Analysis', category: 'technical' },
      { name: 'OWASP Top 10', category: 'technical' },
    ],
    stack: ['TypeScript', 'Node.js', 'Wireshark', 'Nmap', 'Splunk'],
    achievements: ['Implemented secure coding checklist', 'Documented incident playbooks', 'Improved triage response times'],
    projects: baseProjects('Monitoring'),
    contactEmail: 'pedro.galvao@kiwibit.com',
  },
  'marcio-souza': {
    id: 'marcio-souza',
    codename: 'MSOUZA',
    realName: 'Marcio Souza',
    speciality: 'Database Administrator',
    bio: 'Focused on data integrity, SQL performance tuning, backup strategies, and secure access governance for business-critical systems.',
    clearance: 'L-04',
    avatar: 'https://avatars.githubusercontent.com/Porisso90?size=400',
    skills: [
      { name: 'SQL Optimization', category: 'technical' },
      { name: 'Database Security', category: 'technical' },
      { name: 'Data Modeling', category: 'technical' },
    ],
    stack: ['PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Bash'],
    achievements: ['Cut query latency by 60%', 'Designed HA backup strategy', 'Hardened access control policies'],
    projects: baseProjects('Data'),
    contactEmail: 'marcio@kiwibit.com',
  },
  'pedro-souza': {
    id: 'pedro-souza',
    codename: 'PSOUZA',
    realName: 'Pedro Souza',
    speciality: 'Multiplatform Developer',
    bio: 'Builds cross-platform applications with clean architecture, API integration, and consistent UX from web to mobile.',
    clearance: 'L-03',
    avatar: 'https://avatars.githubusercontent.com/Pedryn?size=400',
    skills: [
      { name: 'React Ecosystem', category: 'technical' },
      { name: 'Mobile Integration', category: 'technical' },
      { name: 'TypeScript', category: 'technical' },
    ],
    stack: ['React', 'Next.js', 'React Native', 'TypeScript', 'Tailwind CSS'],
    achievements: ['Shipped multiplatform MVPs', 'Unified web/mobile design system', 'Raised release cadence'],
    projects: baseProjects('Frontend'),
    contactEmail: 'pedro.souza@kiwibit.com',
  },
  'thiago-maia': {
    id: 'thiago-maia',
    codename: 'TMAIA',
    realName: 'Thiago Maia',
    speciality: 'Computer Science',
    bio: 'Computer science student with strong base in algorithms, operating systems, and secure software engineering.',
    clearance: 'L-03',
    avatar: 'https://avatars.githubusercontent.com/TMaia09?size=400',
    skills: [
      { name: 'Algorithms', category: 'technical' },
      { name: 'System Design', category: 'technical' },
      { name: 'Python', category: 'technical' },
    ],
    stack: ['Python', 'Go', 'C', 'Linux', 'GitHub Actions'],
    achievements: ['Optimized backend pipelines', 'Improved CI reliability', 'Built internal tooling prototypes'],
    projects: baseProjects('Architecture'),
    contactEmail: 'thiago@kiwibit.com',
  },
  henrique: {
    id: 'henrique',
    codename: 'HENRIQUE',
    realName: 'Henrique',
    speciality: 'Postgraduate in Cyber Security',
    bio: 'Dedicated to blue-team operations, SIEM pipelines, and practical defense strategies for enterprise threat surfaces.',
    clearance: 'L-04',
    avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=400&h=400&auto=format&fit=crop',
    skills: [
      { name: 'SIEM Operations', category: 'technical' },
      { name: 'Incident Response', category: 'technical' },
      { name: 'Detection Engineering', category: 'technical' },
    ],
    stack: ['Elastic', 'Sigma Rules', 'YARA', 'Python', 'Wazuh'],
    achievements: ['Deployed SOC alerts at scale', 'Lowered MTTR across incidents', 'Created detection rule library'],
    projects: baseProjects('Defense'),
    contactEmail: 'henrique@kiwibit.com',
  },
  'italo-bianchi': {
    id: 'italo-bianchi',
    codename: 'IBIANCHI',
    realName: 'Italo Bianchi',
    speciality: 'Mechatronics',
    bio: 'Mechatronics student working at the intersection of embedded systems, automation, and IoT security best practices.',
    clearance: 'L-02',
    avatar: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=400&h=400&auto=format&fit=crop',
    skills: [
      { name: 'Embedded Systems', category: 'technical' },
      { name: 'IoT Security', category: 'technical' },
      { name: 'Automation', category: 'technical' },
    ],
    stack: ['C', 'Arduino', 'ESP32', 'MQTT', 'Node-RED'],
    achievements: ['Built secure IoT prototypes', 'Improved firmware resilience', 'Automated device monitoring'],
    projects: baseProjects('IoT'),
    contactEmail: 'italo@kiwibit.com',
  },
}

export const MEMBER_IDS = Object.keys(MEMBERS_BY_ID)

export const TEAM_MEMBER_CARDS: TeamMemberCard[] = [
  {
    slug: 'gustavo-costa',
    name: 'GUSTAVO COSTA',
    role: '[ CYBERSEC_SPEC ]',
    desc: 'Software Engineer and Cyber Security Specialist.',
  },
  {
    slug: 'pedro-galvao',
    name: 'PEDRO GALVAO',
    role: '[ SYS_ANALYSIS ]',
    desc: 'Systems Analysis and Development student and Cyber Security enthusiast.',
  },
  {
    slug: 'marcio-souza',
    name: 'MARCIO SOUZA',
    role: '[ DBA_EXPERT ]',
    desc: 'Systems Analysis and Development student and Database Administrator (DBA).',
  },
  {
    slug: 'pedro-souza',
    name: 'PEDRO SOUZA',
    role: '[ MULTIPLATFORM ]',
    desc: 'Graduate in Multiplatform Software Development.',
  },
  {
    slug: 'thiago-maia',
    name: 'THIAGO MAIA',
    role: '[ COMP_SCI ]',
    desc: 'Studying Computer Science and Cyber Security.',
  },
  {
    slug: 'henrique',
    name: 'HENRIQUE',
    role: '[ POSTGRAD_SEC ]',
    desc: 'Pursuing a postgraduate degree in Cyber Security.',
  },
  {
    slug: 'italo-bianchi',
    name: 'ITALO BIANCHI',
    role: '[ MECHATRONICS ]',
    desc: 'Studying Mechatronics.',
  },
]
