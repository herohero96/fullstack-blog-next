import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import prisma from '@/lib/prisma'
import LikeButton from '@/components/article/LikeButton'
import CommentSection from '@/components/article/CommentSection'
import ViewIncrement from '@/components/article/ViewIncrement'

interface PageProps {
  params: Promise<{ slug: string }>
}

const transformArticleTags = (article: any) => {
  if (!article) return article
  const { tags, ...rest } = article
  return {
    ...rest,
    tags: tags ? tags.map((at: any) => at.tag) : [],
  }
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params

  const rawArticle = await prisma.article.findUnique({
    where: { slug },
    include: {
      tags: { include: { tag: true } },
      category: true,
      author: { select: { id: true, username: true } },
      _count: { select: { likes: true, comments: true } },
    },
  })

  if (!rawArticle) return notFound()

  const article = transformArticleTags(rawArticle)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ViewIncrement slug={article.slug} />

      <article>
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1">
            ← 返回
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>

          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <span>{new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
            {article.author && <span>作者：{article.author.username}</span>}
            {article.category && (
              <Link href={`/category/${article.category.slug}`} className="text-blue-600 hover:underline">
                {article.category.name}
              </Link>
            )}
            <span>{article.viewCount} 次浏览</span>
            {!article.published && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">草稿</span>
            )}
          </div>

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {article.tags.map((tag: any) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hover:bg-gray-200"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {article.coverImage && (
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full rounded-lg mb-6 object-cover max-h-64"
          />
        )}

        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {article.content}
          </ReactMarkdown>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <LikeButton slug={article.slug} />
        </div>

        <CommentSection slug={article.slug} />
      </article>
    </div>
  )
}
