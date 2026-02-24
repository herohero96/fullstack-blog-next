'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

interface Draft {
  id: number
  title: string
  summary: string
  slug: string
  createdAt: string
  updatedAt: string
}

export default function DraftsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (!isAuthenticated) return
    fetch('/api/articles?published=false&limit=50')
      .then((r) => r.json())
      .then((res) => setDrafts(res.articles ?? []))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-500">加载中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">草稿箱</h1>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 返回首页</Link>
      </div>

      {drafts.length === 0 ? (
        <p className="text-gray-500">暂无草稿</p>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div key={draft.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{draft.title}</h2>
                  {draft.summary && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{draft.summary}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    更新于 {new Date(draft.updatedAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                <Link
                  href={`/preview/${draft.slug}`}
                  className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  预览
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
