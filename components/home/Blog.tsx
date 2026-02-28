import Link from 'next/link'
import { listPublishedPosts } from '@/lib/blog-store'

export default async function Blog() {
  const { items } = await listPublishedPosts({ page: 1, pageSize: 3 })

  return (
    <>
      <section className="py-40 px-8" id="blog">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col mb-24">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-4">Section_03 // RESEARCH_LOGS</span>
            <div className="flex flex-col md:flex-row items-end justify-between gap-10">
              <h2 className="text-white text-6xl font-black tracking-tighter uppercase leading-none">Blog</h2>
              <span className="text-white/20 text-[10px] font-bold tracking-ultra uppercase flex items-center gap-4">
                <span className="w-12 h-px bg-white/20"></span>
                Latest Intelligence
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {items.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="w-full group block border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-500 p-8 relative flex flex-col h-full"
              >
                <div className="mb-8 flex justify-between items-start">
                  <span className="bg-white text-black text-[9px] font-black px-2 py-1 uppercase tracking-widest">{post.categories[0] ?? 'post'}</span>
                  <span className="text-[10px] font-mono text-white/40 block">{new Date(post.publishedAt ?? post.updatedAt).toLocaleDateString('en-US')}</span>
                </div>
                <h3 className="text-white text-2xl font-black uppercase tracking-tight mb-4">{post.title}</h3>
                <p className="text-[12px] text-white/60 font-light leading-relaxed mb-8 flex-grow">{post.excerpt}</p>
                <div className="w-full h-px bg-white/10 mt-auto"></div>
              </Link>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/blog" className="inline-block border border-white/20 text-white px-12 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
              View All Transmissions
            </Link>
          </div>
        </div>
      </section>
      <div className="section-divider"></div>
    </>
  )
}
