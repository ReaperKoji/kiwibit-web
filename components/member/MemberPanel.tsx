'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MEMBERS_BY_ID, MEMBER_IDS, type Member } from '@/data/members'

type SectionItem = {
  id: 'home' | 'about' | 'projects' | 'reports'
  label: string
}

type ContactStatus = 'idle' | 'sending' | 'success' | 'error'

type MemberGithubRepo = {
  name: string
  htmlUrl: string
  description: string
  language: string
  stars: number
  pushedAt: string
}

type MemberGithubProfile = {
  username: string
  profileUrl: string
  avatarUrl: string
  bio: string
  followers: number
  following: number
  publicRepos: number
}

type MemberReputation = {
  score: number
  level: 'starter' | 'builder' | 'pro' | 'elite'
}

const sectionStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.04,
    },
  },
}

const heroReveal = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const } },
}

const sectionReveal = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] as const } },
}

function Header({
  selectedId,
  onSelect,
  sections,
  activeSection,
}: {
  selectedId: string
  onSelect: (id: string) => void
  sections: SectionItem[]
  activeSection: SectionItem['id']
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--surface-border)] bg-[var(--surface-header)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="rounded border border-[var(--surface-border)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] transition hover:border-[var(--text-main)] hover:text-[var(--text-main)]"
          >
            Home
          </Link>
          <div className="font-semibold tracking-wide text-[var(--text-main)]">KIWI BIT</div>
        </div>
        <nav className="hidden gap-8 text-sm md:flex">
          {sections.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`transition ${
                activeSection === item.id ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
              aria-current={activeSection === item.id ? 'location' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <nav className="flex items-center gap-3" aria-label="Member selector">
          {MEMBER_IDS.map((id) => {
            const member = MEMBERS_BY_ID[id]
            const isActive = selectedId === member.id

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onSelect(member.id)}
                className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-main)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-bg)]"
                aria-label={member.codename}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={`h-9 w-9 overflow-hidden rounded-full ring-1 ring-[var(--surface-border)] transition-all group-hover:scale-105 ${
                    isActive ? 'ring-2 ring-[var(--text-main)]' : 'opacity-70'
                  }`}
                >
                  <Image src={member.avatar} alt={member.codename} width={36} height={36} sizes="36px" className="h-full w-full object-cover" />
                </div>
              </button>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

function HeroSection({ member, parallaxY }: { member: Member; parallaxY: number }) {
  return (
    <section id="home" className="bg-[var(--surface-bg)] pb-28 pt-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 md:px-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-[var(--text-muted)]">+200 Projects | +50 Clients</p>
          <h1 className="text-6xl font-semibold leading-tight text-[var(--text-main)] md:text-7xl">Hello</h1>
          <p className="mt-6 max-w-md text-[var(--text-soft)]">
            I&apos;m {member.realName}, {member.speciality}. I build clean and elegant digital experiences focused on performance and impact.
          </p>
          <div className="mt-8 flex gap-6 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <span>{member.codename}</span>
            <span>{member.clearance}</span>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex justify-end">
          <div style={{ transform: `translateY(${parallaxY}px)` }} className="will-change-transform transition-transform duration-200">
            <Image
              src={member.avatar}
              alt={member.codename}
              width={420}
              height={420}
              sizes="(max-width: 1024px) 320px, 420px"
              priority
              className="h-[26rem] w-[22rem] rounded-lg object-cover md:h-[28rem] md:w-[26rem]"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function AboutSection({ member }: { member: Member }) {
  return (
    <section id="about" className="py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:px-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h2 className="mb-6 text-3xl font-semibold text-[var(--text-main)]">About Me</h2>
          <p className="leading-relaxed text-[var(--text-soft)]">{member.bio}</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-8 shadow-sm">
          <p className="text-sm text-[var(--text-muted)]">Average increase in client revenue</p>
          <h3 className="mt-4 text-5xl font-semibold text-[var(--text-main)]">120%</h3>
          <p className="mt-2 text-sm text-[var(--text-soft)]">in the first 6 months</p>
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-sm">
          <Image src={member.avatar} alt={`${member.codename} avatar`} width={80} height={80} sizes="80px" className="rounded-full" />
          <p className="mt-4 text-sm text-[var(--text-soft)]">"We saw a massive improvement in engagement. The design was not just beautiful but effective."</p>
        </div>
      </div>
    </section>
  )
}

function ProjectsSection({ member }: { member: Member }) {
  const [repos, setRepos] = useState<MemberGithubRepo[]>([])
  const [githubProfile, setGithubProfile] = useState<MemberGithubProfile | null>(null)
  const [githubMetrics, setGithubMetrics] = useState<{ totalStars: number; totalRepos: number } | null>(null)
  const [reputation, setReputation] = useState<MemberReputation | null>(null)
  const [loadingRepos, setLoadingRepos] = useState(true)

  useEffect(() => {
    let active = true

    async function loadRepos() {
      setLoadingRepos(true)
      try {
        const [response, repResponse] = await Promise.all([
          fetch(`/api/github/member/${member.id}`),
          fetch(`/api/member/reputation/${member.id}`),
        ])
        if (!response.ok) {
          if (active) setRepos([])
          return
        }

        const payload = (await response.json()) as {
          profile?: MemberGithubProfile | null
          repos?: MemberGithubRepo[]
          metrics?: { totalStars: number; totalRepos: number }
        }
        if (active) {
          setGithubProfile(payload.profile ?? null)
          setRepos(Array.isArray(payload.repos) ? payload.repos : [])
          setGithubMetrics(payload.metrics ?? null)
          if (repResponse.ok) {
            const repPayload = (await repResponse.json()) as MemberReputation
            setReputation(repPayload)
          }
        }
      } catch {
        if (active) {
          setRepos([])
          setGithubProfile(null)
          setGithubMetrics(null)
          setReputation(null)
        }
      } finally {
        if (active) setLoadingRepos(false)
      }
    }

    void loadRepos()
    return () => {
      active = false
    }
  }, [member.id])

  if (loadingRepos) {
    return (
      <section id="projects" className="pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <p className="text-sm text-[var(--text-muted)]">Loading GitHub repositories...</p>
        </div>
      </section>
    )
  }

  if (repos.length > 0) {
    return (
      <section id="projects" className="pb-24">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-[var(--surface-border)] bg-[linear-gradient(120deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {githubProfile ? (
                <Image src={githubProfile.avatarUrl} alt={githubProfile.username} width={52} height={52} className="h-13 w-13 rounded-full border border-[var(--surface-border)]" />
              ) : (
                <div className="h-13 w-13 rounded-full border border-[var(--surface-border)] bg-[var(--surface-card)]" />
              )}
              <div>
                <h3 className="text-2xl font-semibold text-[var(--text-main)]">GitHub Portfolio</h3>
                <p className="text-sm text-[var(--text-soft)]">
                  {githubProfile ? githubProfile.bio : 'Member repositories synced from GitHub API.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {githubProfile ? (
                <a href={githubProfile.profileUrl} target="_blank" rel="noreferrer" className="rounded border border-[var(--surface-border)] px-3 py-1 hover:border-[var(--text-main)] hover:text-[var(--text-main)]">
                  @{githubProfile.username}
                </a>
              ) : null}
              <span className="rounded border border-[var(--surface-border)] px-3 py-1">{repos.length} repos</span>
              <span className="rounded border border-[var(--surface-border)] px-3 py-1">
                {githubMetrics?.totalStars ?? repos.reduce((sum, repo) => sum + repo.stars, 0)} stars
              </span>
              {reputation ? <span className="rounded border border-[var(--surface-border)] px-3 py-1">rep {reputation.level} ({reputation.score})</span> : null}
              {githubProfile ? <span className="rounded border border-[var(--surface-border)] px-3 py-1">{githubProfile.followers} followers</span> : null}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {repos.map((repo) => (
              <motion.article key={repo.htmlUrl} whileHover={{ y: -4 }} className="group rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-5">
                <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="block">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h4 className="text-lg font-semibold text-[var(--text-main)]">{repo.name}</h4>
                    <span className="text-xs text-[var(--text-muted)]">Stars: {repo.stars}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text-soft)]">{repo.description}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{repo.language}</span>
                    <span className="rounded border border-[var(--surface-border)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      stars {repo.stars}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      Updated {new Date(repo.pushedAt).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </a>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="projects" className="pb-24">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-6 rounded-xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-card)] p-4 text-sm text-[var(--text-soft)]">
          GitHub profile not found for this member yet. Configure username in `data/member-github.ts`.
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3 md:px-8">
        {member.projects.map((project) => (
          <motion.article key={project.title} whileHover={{ y: -4 }} className="group">
            <a href={project.href} target="_blank" rel="noreferrer" className="block">
              <div className="overflow-hidden rounded-xl border border-[var(--surface-border)]">
                <Image
                  src={project.image}
                  alt={project.title}
                  width={500}
                  height={400}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <h4 className="text-lg font-semibold text-[var(--text-main)]">{project.title}</h4>
                <span className="rounded border border-[var(--surface-border)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] transition group-hover:border-[var(--text-main)] group-hover:text-[var(--text-main)]">
                  View case
                </span>
              </div>
            </a>
          </motion.article>
        ))}
      </div>
    </section>
  )
}

function ContactForm({ member, onCtaClick }: { member: Member; onCtaClick?: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<ContactStatus>('idle')
  const [feedback, setFeedback] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    setFeedback('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          name,
          email,
          message,
        }),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      setStatus('success')
      setFeedback('Request sent. The member will contact you soon.')
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      setStatus('error')
      setFeedback('Unable to send now. Please try again in a moment.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        required
        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-main)]"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-main)]"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={`Request a security assessment with ${member.realName}`}
        required
        rows={4}
        className="w-full rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-main)]"
      />
      <button
        type="submit"
        disabled={status === 'sending'}
        onClick={onCtaClick}
        className="rounded border border-[var(--text-main)] px-6 py-3 text-xs uppercase tracking-[0.22em] text-[var(--text-main)] transition hover:bg-[var(--text-main)] hover:text-black disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending...' : 'Request Security Assessment'}
      </button>
      <p aria-live="polite" className={`text-sm ${status === 'error' ? 'text-red-300' : 'text-[var(--text-soft)]'}`}>
        {feedback}
      </p>
    </form>
  )
}

function MemberIntelSection({ member, onCtaClick }: { member: Member; onCtaClick?: () => void }) {
  const technicalSkills = member.skills.filter((s) => s.category === 'technical')

  return (
    <section id="reports" className="relative mt-24 overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-bg)] text-[var(--text-main)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.04]" />

      <div className="relative px-8 py-20 md:px-16">
        <div className="mb-16 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Member Profile</p>
          <h2 className="mt-4 text-5xl font-semibold md:text-6xl">{member.codename}</h2>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <h3 className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Profile</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--surface-border)] pb-2">
                <span className="text-[var(--text-muted)]">Real Name</span>
                <span>{member.realName}</span>
              </div>
              <div className="flex justify-between border-b border-[var(--surface-border)] pb-2">
                <span className="text-[var(--text-muted)]">Clearance</span>
                <span>{member.clearance}</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Core Skills</h3>
            <ul className="space-y-3">
              {technicalSkills.slice(0, 4).map((skill) => (
                <li key={skill.name} className="border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-2 text-sm backdrop-blur-sm">
                  {skill.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Toolset / Stack</h3>
            <div className="flex flex-wrap gap-2">
              {member.stack.map((tool) => (
                <span key={tool} className="rounded border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-1.5 text-xs uppercase tracking-[0.14em]">
                  {tool}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">Recent Achievements</h3>
            <ul className="space-y-2 text-sm text-[var(--text-soft)]">
              {member.achievements.map((item) => (
                <li key={item} className="border-l-2 border-[var(--surface-border)] pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <ContactForm member={member} onCtaClick={onCtaClick} />
          <p className="text-sm text-[var(--text-muted)]">or email directly: {member.contactEmail}</p>
        </div>
      </div>
    </section>
  )
}

function MemberSkeleton() {
  return (
    <div className="animate-pulse space-y-8 pt-32">
      <div className="h-10 w-64 rounded bg-[var(--surface-card)]" />
      <div className="h-72 rounded bg-[var(--surface-card)]" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-44 rounded bg-[var(--surface-card)]" />
        <div className="h-44 rounded bg-[var(--surface-card)]" />
        <div className="h-44 rounded bg-[var(--surface-card)]" />
      </div>
    </div>
  )
}

type MemberPanelProps = {
  initialMemberId?: string
  initialMemberData?: Member
}

export default function MemberPanel({ initialMemberId, initialMemberData }: MemberPanelProps) {
  const router = useRouter()
  const defaultMemberId = MEMBER_IDS[0]
  const safeMemberId = initialMemberId && MEMBERS_BY_ID[initialMemberId] ? initialMemberId : defaultMemberId
  const member = initialMemberData ?? MEMBERS_BY_ID[safeMemberId]

  const [activeSection, setActiveSection] = useState<SectionItem['id']>('home')
  const [parallaxY, setParallaxY] = useState(0)
  const [isSwitchingMember, setIsSwitchingMember] = useState(false)
  const [enteredAt] = useState(() => Date.now())

  const sections = useMemo<SectionItem[]>(
    () => [
      { id: 'home', label: member.codename },
      { id: 'about', label: 'About' },
      { id: 'projects', label: 'Cases' },
      { id: 'reports', label: 'Intel' },
    ],
    [member.codename]
  )

  useEffect(() => {
    const ids = sections.map((item) => item.id)
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) {
          setActiveSection(visible[0].target.id as SectionItem['id'])
        }
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: [0.2, 0.4, 0.6],
      }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  useEffect(() => {
    if (!member?.id) return
    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'section_view',
        memberId: member.id,
        section: activeSection,
      }),
    })
  }, [activeSection, member?.id])

  useEffect(() => {
    const onLeave = () => {
      const ms = Date.now() - enteredAt
      navigator.sendBeacon(
        '/api/analytics/track',
        JSON.stringify({
          type: 'profile_dwell',
          memberId: member.id,
          ms,
        })
      )
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [enteredAt, member.id])

  useEffect(() => {
    const onScroll = () => {
      setParallaxY(Math.max(-14, Math.min(14, window.scrollY * -0.03)))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleSelectMember(id: string) {
    if (id === safeMemberId) return
    setIsSwitchingMember(true)
    setTimeout(() => {
      router.push(`/member/${id}`)
    }, 320)
  }

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] font-sans text-[var(--text-main)]">
      <a
        href="#member-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-[var(--text-main)] focus:px-3 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>
      <div aria-live="polite" className="sr-only">
        {isSwitchingMember ? 'Loading selected member profile' : `Viewing profile for ${member.realName}`}
      </div>
      <Header selectedId={safeMemberId} onSelect={handleSelectMember} sections={sections} activeSection={activeSection} />
      <main id="member-main" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
        {isSwitchingMember ? (
          <MemberSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={safeMemberId} variants={sectionStagger} initial="hidden" animate="show" exit="hidden">
              <motion.div variants={heroReveal}>
                <HeroSection member={member} parallaxY={parallaxY} />
              </motion.div>
              <motion.div variants={sectionReveal}>
                <AboutSection member={member} />
              </motion.div>
              <motion.div variants={sectionReveal}>
                <ProjectsSection member={member} />
              </motion.div>
              <motion.div variants={sectionReveal}>
                <MemberIntelSection
                  member={member}
                  onCtaClick={() => {
                    void fetch('/api/analytics/track', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        type: 'cta_click',
                        memberId: member.id,
                        section: 'reports',
                      }),
                    })
                  }}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}


