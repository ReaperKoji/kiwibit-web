import type { Metadata } from 'next'
import BlogPostPage, { generateMetadata as generateBaseMetadata, generateStaticParams } from '@/app/blog/[slug]/page'
import { absoluteUrl } from '@/lib/site-config'

type PostPageProps = {
  params: Promise<{ slug: string }>
}

export { generateStaticParams }

export async function generateMetadata(props: PostPageProps): Promise<Metadata> {
  const base = await generateBaseMetadata(props)
  const { slug } = await props.params
  return {
    ...base,
    alternates: {
      canonical: absoluteUrl(`/en/blog/${slug}`),
      languages: {
        en: absoluteUrl(`/en/blog/${slug}`),
        'pt-BR': absoluteUrl(`/blog/${slug}`),
      },
    },
  }
}

export default BlogPostPage
