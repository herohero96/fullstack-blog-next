'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import { useAuth } from '@/contexts/AuthContext'

interface Category {
  id: number
  name: string
  slug: string
}

interface Tag {
  id: number
  name: string
  slug: string
}

interface ArticleData {
  title: string
  summary: string
  content: string
  categoryId?: number | null
  category?: { id: number } | null
  tags?: { id: number }[]
  coverImage?: string
  published: boolean
  slug?: string
}

interface ArticleFormProps {
  mode: 'create' | 'edit'
  initialData?: ArticleData
}

export default function ArticleForm({ mode, initialData }: ArticleFormProps) {
  const router = useRouter()
  const { token } = useAuth()

  const [title, setTitle] = useState(initialData?.title || '')
  const [summary, setSummary] = useState(initialData?.summary || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [categoryId, setCategoryId] = useState(
    initialData?.category?.id ? String(initialData.category.id) : ''
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tags?.map((t) => String(t.id)) || []
  )
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '')
  const [published, setPublished] = useState(initialData?.published ?? true)
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then(setCategories).catch(() => {})
    fetch('/api/tags').then((r) => r.json()).then(setTags).catch(() => {})
  }, [])

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = '标题不能为空'
    if (!content.trim()) errs.content = '内容不能为空'
    if (coverImage.trim() && !/^https?:\/\//.test(coverImage.trim())) {
      errs.coverImage = '封面图片必须是 http/https 链接'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        content,
        categoryId: categoryId ? Number(categoryId) : null,
        tags: selectedTagIds.map(Number),
        coverImage: coverImage.trim() || null,
        published,
      }

      let res: Response
      if (mode === 'edit' && initialData?.slug) {
        res = await fetch(`/api/articles/${initialData.slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/articles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const data = await res.json()
        setErrors({ form: data.message || (mode === 'edit' ? '更新文章失败' : '创建文章失败') })
        return
      }

      const article = await res.json()
      router.push(`/article/${article.slug}`)
    } catch {
      setErrors({ form: mode === 'edit' ? '更新文章失败，请重试。' : '创建文章失败，请重试。' })
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel = mode === 'edit' ? '保存修改' : '创建文章'
  const submittingLabel = mode === 'edit' ? '保存中...' : '创建中...'

  return (
    <>
      {errors.form && <p className="text-red-600 text-sm mb-4">{errors.form}</p>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            标题 *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-400' : 'border-gray-300'}`}
            placeholder="文章标题"
            maxLength={200}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
            摘要
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="文章摘要简介"
            maxLength={500}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">内容 *</label>
          <MarkdownEditor value={content} onChange={setContent} />
          {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              分类
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">无分类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="coverImage" className="block text-sm font-medium text-gray-700 mb-1">
              封面图片链接
            </label>
            <input
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.coverImage ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="https://example.com/image.jpg"
            />
            {errors.coverImage && (
              <p className="text-red-500 text-xs mt-1">{errors.coverImage}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(String(tag.id))}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedTagIds.includes(String(tag.id))
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="published"
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="published" className="text-sm text-gray-700">
            {mode === 'edit' ? '已发布' : '立即发布'}
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </>
  )
}
