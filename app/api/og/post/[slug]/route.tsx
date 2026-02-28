import { ImageResponse } from 'next/og'
import { getPublishedPostBySlug } from '@/lib/blog-store'

export const runtime = 'nodejs'

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  const title = post?.title ?? 'KIWI BIT Blog'
  const excerpt = post?.excerpt ?? 'Security engineering, portfolio intelligence and practical playbooks.'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background:
            'linear-gradient(125deg, rgba(4,9,18,1) 0%, rgba(16,30,54,1) 45%, rgba(8,17,33,1) 100%)',
          color: '#f7fafc',
          padding: '64px',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, opacity: 0.8 }}>KIWI BIT // BLOG</div>
        <div>
          <div style={{ fontSize: 62, lineHeight: 1.08, fontWeight: 700 }}>{title.slice(0, 90)}</div>
          <div style={{ marginTop: 24, fontSize: 28, opacity: 0.85 }}>{excerpt.slice(0, 140)}</div>
        </div>
        <div style={{ fontSize: 20, letterSpacing: 2, opacity: 0.75 }}>SECURITY ENGINEERING</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
