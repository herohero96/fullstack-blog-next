'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/contexts/AuthContext'

interface Article {
  id: number
  title: string
  content: string
  summary: string
  slug: string
  published: boolean
  createdAt: string
  coverImage?: string
  category?: { name: string }
  author?: { username: string }
}

export default function PreviewPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated || !slug) return
    fetch(`/api/articles/${slug}?preview=true`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setArticle(data)
      })
      .catch(() => setError('加载失败'))
      .finally(() => setLoading(false))
  }, [isAuthenticated, slug])

  const handlePublish = async () => {
    if (!article) return
    setPublishing(true)
    try {
      const res = await fetch(`/api/articles/${article.id}/publish`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        router.push(`/article/${article.slug}`)
      } else {
        setError('发布失败，请重试')
      }
    } catch {
      setError('发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-500">加载中...</div>
  }

  if (error || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-red-500">{error || '文章不存在'}</p>
        <Link href="/drafts" className="text-blue-600 hover:underline mt-2 inline-block">← 返回草稿箱</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 预览提示栏 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 text-sm font-medium">📝 草稿预览</span>
          <span className="text-yellow-500 text-sm">此文章尚未发布</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/drafts" className="text-sm text-gray-500 hover:text-gray-700">
            ← 草稿箱
          </Link>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? '发布中...' : '✓ 确认发布'}
          </button>
        </div>
      </div>

      {/* 文章内容 */}
      <article>
        {article.coverImage && (
          <img src={article.coverImage} alt={article.title} className="w-full h-64 object-cover rounded-lg mb-6" />
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-6 flex-wrap">
          <span>{new Date(article.createdAt).toLocaleDateString('zh-CN')}</span>
          {article.author && <span>作者：{article.author.username}</span>}
          {article.category && <span>{article.category.name}</span>}
        </div>
        {article.summary && (
          <p className="text-gray-600 bg-gray-50 rounded-lg p-4 mb-6 text-sm leading-relaxed">{article.summary}</p>
        )}
        <div className="prose prose-gray max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
        </div>
      </article>

      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
    </div>
  )
}
