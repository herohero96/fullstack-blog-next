'use client'

import ArticleForm from '@/components/article/ArticleForm'

export default function CreateArticlePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">创建文章</h1>
      <ArticleForm mode="create" />
    </div>
  )
}
