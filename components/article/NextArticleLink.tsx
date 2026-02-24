import Link from 'next/link'

interface NextArticleLinkProps {
  article: { title: string; slug: string } | null
}

export default function NextArticleLink({ article }: NextArticleLinkProps) {
  if (!article) return null

  return (
    <div className="mt-6 pt-6 border-t border-gray-200" data-testid="next-article-nav">
      <span className="text-sm text-gray-500">下一篇</span>
      <Link
        href={`/article/${article.slug}`}
        className="block mt-1 text-gray-900 font-medium hover:underline"
      >
        {article.title}
      </Link>
    </div>
  )
}
