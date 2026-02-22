'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import ArticleCard from '@/components/article/ArticleCard'
import Pagination from '@/components/ui/Pagination'
import AuthGuard from '@/components/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'
import type { Article, Category, Tag } from '@/types'

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
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
    ])
      .then(([cats, tgs]) => {
        setCategories(cats)
        setTags(tgs)
      })
      .catch(() => {})
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
      <AuthGuard />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900">博客</h1>
          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600">你好，{user?.username}</span>
                <Link href="/create" className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
                  写文章
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin/users" className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                    后台
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                  登录
                </Link>
                <Link href="/register" className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        {/* 左侧文章标题列表 */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">文章列表</h2>
            <ul className="space-y-2">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-xs text-gray-600 hover:text-blue-600 line-clamp-2 leading-relaxed block"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* 右侧主内容 */}
        <div className="flex-1 min-w-0">
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
        </div>
      </main>
    </div>
  )
}
