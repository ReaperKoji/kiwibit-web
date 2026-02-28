import { listAllPostsForAdmin } from '@/lib/blog-store'
import { isDatabaseEnabled, prisma } from '@/lib/prisma'

export async function getMemberReputation(memberId: string) {
  const posts = await listAllPostsForAdmin()
  const byMember = posts.filter((post) => post.authorId === memberId)
  const published = byMember.filter((post) => post.status === 'published')
  const featured = byMember.filter((post) => post.featured)
  let engagementActions = 0

  if (isDatabaseEnabled()) {
    engagementActions = await prisma.auditEvent.count({
      where: {
        action: { in: ['share_click', 'post_cta_click', 'tag_click'] },
      },
    })
  }

  const score = Math.min(1000, published.length * 80 + featured.length * 40 + byMember.length * 20 + engagementActions)
  const level = score >= 700 ? 'elite' : score >= 400 ? 'pro' : score >= 180 ? 'builder' : 'starter'

  return {
    memberId,
    score,
    level,
    stats: {
      totalPosts: byMember.length,
      publishedPosts: published.length,
      featuredPosts: featured.length,
      engagementActions,
    },
  }
}
