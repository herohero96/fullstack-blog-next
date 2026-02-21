'use client'

import { useCallback, useEffect, useState } from 'react'

interface Author {
  id: number
  username: string
}

interface CommentItem {
  id: number
  content: string
  createdAt: string
  author: Author
  replies: CommentItem[]
}

interface CommentSectionProps {
  slug: string
}

export default function CommentSection({ slug }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [content, setContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${slug}/comments`)
      if (!res.ok) return
      const data = await res.json()
      setComments(data)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const submitComment = async (text: string, parentId?: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      alert('请先登录后再评论')
      return
    }
    if (!text.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/articles/${slug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text.trim(), parentId }),
      })
      if (res.ok) {
        setContent('')
        setReplyContent('')
        setReplyingTo(null)
        await fetchComments()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (id: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) return
    const res = await fetch(`/api/articles/${slug}/comments?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await fetchComments()
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">评论 ({comments.length})</h2>

      <div className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={() => submitComment(content)}
          disabled={submitting || !content.trim()}
          className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {submitting ? '提交中...' : '发表评论'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">加载评论中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">暂无评论，来发表第一条评论吧！</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">{comment.author.username}</span>
                  <span className="ml-2 text-gray-400">
                    {new Date(comment.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-blue-600 hover:underline"
                  >
                    回复
                  </button>
                  <button
                    onClick={() => removeComment(comment.id)}
                    className="text-red-600 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>

              {replyingTo === comment.id && (
                <div className="mt-3 ml-4">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="写下你的回复..."
                    rows={2}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => submitComment(replyContent, comment.id)}
                      disabled={submitting || !replyContent.trim()}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                    >
                      提交回复
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyContent('')
                      }}
                      className="text-xs text-gray-500"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              {comment.replies.length > 0 && (
                <div className="mt-3 ml-4 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="rounded bg-gray-50 p-3">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{reply.author.username}</span>
                        <span className="ml-2">{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{reply.content}</p>
                      <button
                        onClick={() => removeComment(reply.id)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
