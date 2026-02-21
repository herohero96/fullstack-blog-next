'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ArticleCard from '@/components/article/ArticleCard'
import Pagination from '@/components/ui/Pagination'
import type { Article } from '@/types'

export default function CategoryPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [categoryName, setCategoryName] = useState(slug)

  const fetchArticles = useCallback((p: number) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(p), limit: '10', published: 'true', category: slug })
    fetch(`/api/articles?${qs}`)
      .then((r) => r.json())
      .then((res) => {
        const list: Article[] = res.articles ?? []
        setArticles(list)
        setTotalPages(res.totalPages ?? 1)
        if (list.length > 0 && list[0].category) {
          setCategoryName(list[0].category.name)
        }
      })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    fetchArticles(page)
  }, [page, fetchArticles])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← 返回首页
          </Link>
          <h1 className="text-xl font-bold text-gray-900">分类</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 面包屑 */}
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-gray-700">首页</Link>
          <span>/</span>
          <span className="text-gray-900">分类：{categoryName}</span>
        </nav>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          分类：<span className="text-blue-600">{categoryName}</span>
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-gray-500 text-center py-12">该分类下暂无文章。</p>
        ) : (
          <>
            <div className="space-y-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </main>
    </div>
  )
}
