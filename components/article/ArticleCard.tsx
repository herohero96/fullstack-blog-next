'use client'

import Link from 'next/link'
import type { Article } from '@/types'

interface ArticleCardProps {
  article: Article
}

export default function ArticleCard({ article }: ArticleCardProps) {
  return (
    <article className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      {article.coverImage && (
        <Link href={`/article/${article.slug}`}>
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-48 object-cover rounded-md mb-4"
          />
        </Link>
      )}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {article.category && (
          <Link
            href={`/category/${article.category.slug}`}
            className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
          >
            {article.category.name}
          </Link>
        )}
        {!article.published && (
          <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded">草稿</span>
        )}
        <span className="text-xs text-gray-400">
          {new Date(article.createdAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <Link href={`/article/${article.slug}`}>
        <h2 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2">
          {article.title}
        </h2>
      </Link>
      {article.summary && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.summary}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full hover:bg-gray-200 transition-colors"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0 ml-3">
          <span>👁 {article.viewCount ?? 0}</span>
          {article._count && (
            <>
              <span>💬 {article._count.comments}</span>
              <span>❤️ {article._count.likes}</span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
