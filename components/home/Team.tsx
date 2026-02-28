import Link from 'next/link'
import Image from 'next/image'
import { MEMBERS_BY_ID, TEAM_MEMBER_CARDS } from '@/data/members'
import { MEMBER_GITHUB_USERNAMES } from '@/data/member-github'

export default function Team() {
  return (
    <section className="matrix-grid-texture relative px-8 py-40" id="team">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-32 flex flex-col items-center text-center">
          <span className="mb-4 text-[9px] font-mono uppercase tracking-[0.4em] text-white/30">
            Section_04 // TACTICAL_OPERATIVES_MATRIX
          </span>
          <h2 className="mb-6 text-5xl font-black uppercase tracking-[0.2em] text-white md:text-7xl">OPERATIONAL_MATRIX_V2.0</h2>
          <div className="h-px w-full max-w-4xl bg-white/10" />
        </div>
        <div className="mb-24">
          <div className="grid grid-cols-1 justify-items-center gap-16 sm:grid-cols-2 md:gap-24 lg:grid-cols-3">
            {TEAM_MEMBER_CARDS.map((member) => (
              <Link key={member.slug} href={`/member/${member.slug}#projects`} className="group relative flex w-full max-w-[280px] flex-col items-center text-center">
                <div className="relative mb-6 h-40 w-40">
                  <div className="absolute inset-0 scale-150 bg-[radial-gradient(circle,rgba(255,255,255,0.15)_0%,transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative h-full w-full rounded-full border border-white/20 p-1 transition-colors duration-500 group-hover:border-white">
                    <div className="h-full w-full overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                      <Image
                        src={MEMBERS_BY_ID[member.slug].avatar}
                        alt={member.name}
                        width={160}
                        height={160}
                        sizes="160px"
                        className="h-full w-full object-cover transition duration-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h5 className="text-xl font-black uppercase tracking-tighter text-white">{member.name}</h5>
                  <span className="block text-[9px] font-mono tracking-widest text-white/60">{member.role}</span>
                  <p className="mt-4 text-[11px] font-mono text-white/40 transition-all duration-500 group-hover:text-white/80">{member.desc}</p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="rounded border border-white/20 px-2 py-1 text-[9px] font-mono uppercase tracking-[0.2em] text-white/60">
                      {MEMBER_GITHUB_USERNAMES[member.slug] ? `@${MEMBER_GITHUB_USERNAMES[member.slug]}` : 'GITHUB_PENDING'}
                    </span>
                    <span className="rounded bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-black">
                      View Portfolio
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

