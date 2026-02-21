'use client'

import { useState, useEffect, useCallback } from 'react'
import ArticleCard from '@/components/article/ArticleCard'
import Pagination from '@/components/ui/Pagination'
import type { Article, Category, Tag } from '@/types'

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]).then(([cats, tgs]) => {
      setCategories(cats)
      setTags(tgs)
    }).catch(() => {})
  }, [])

  const fetchArticles = useCallback((p: number, category: string, tag: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '10', published: 'true' })
    if (category) params.set('category', category)
    if (tag) params.set('tag', tag)

    fetch(`/api/articles?${params}`)
      .then((r) => r.json())
      .then((res) => {
        setArticles(res.articles ?? [])
        setTotalPages(res.totalPages ?? 1)
      })
      .catch(() => setError('加载文章失败，请稍后重试。'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchArticles(page, selectedCategory, selectedTag)
  }, [page, selectedCategory, selectedTag, fetchArticles])

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug)
    setSelectedTag('')
    setPage(1)
  }

  const handleTagChange = (slug: string) => {
    setSelectedTag(slug)
    setSelectedCategory('')
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">博客</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 分类筛选 */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => handleCategoryChange('')}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                !selectedCategory && !selectedTag
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

     {/* 标签筛选 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagChange(tag.slug)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  selectedTag === tag.slug
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        )}

        {/* 文章列表 */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{error}</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <h3 className="mt-3 text-sm font-medium text-gray-900">暂无文章</h3>
            <p className="mt-1 text-sm text-gray-500">还没有发布的文章。</p>
          </div>
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
