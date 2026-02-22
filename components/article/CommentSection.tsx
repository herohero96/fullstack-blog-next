'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Author {
  id: number
  username: string
}

interface CommentItem {
  id: number
  content: string
  createdAt: string
  author: Author | null
  guestName: string | null
  replies: CommentItem[]
}

interface CommentSectionProps {
  slug: string
}

export default function CommentSection({ slug }: CommentSectionProps) {
  const { token, isAuthenticated } = useAuth()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [content, setContent] = useState('')
  const [guestName, setGuestName] = useState('')
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyGuestName, setReplyGuestName] = useState('')
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

  // SSE 实时更新
  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      es = new EventSource(`/api/articles/${slug}/comments/stream`)
      es.onmessage = () => {
        // 收到新评论事件，重新拉取完整列表
        fetchComments()
      }
      es.onerror = () => {
        es?.close()
        // 3 秒后自动重连
        reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [slug, fetchComments])

  const submitComment = async (text: string, parentId?: number, name?: string) => {
    if (!text.trim()) return

    // 游客需要昵称
    if (!isAuthenticated) {
      const trimmedName = (name ?? '').trim()
      if (trimmedName.length < 2 || trimmedName.length > 20) {
        alert('请输入 2-20 字的昵称')
        return
      }
    }

    setSubmitting(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      const res = await fetch(`/api/articles/${slug}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: text.trim(),
          parentId,
          guestName: isAuthenticated ? undefined : (name ?? '').trim(),
        }),
      })

      if (res.status === 429) {
        alert('评论过于频繁，请稍后再试')
        return
      }

      if (res.ok) {
        setContent('')
        setGuestName('')
        setReplyContent('')
        setReplyGuestName('')
        setReplyingTo(null)
        await fetchComments()
      } else {
        const data = await res.json()
        alert(data.message || '评论失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const removeComment = async (id: number) => {
    if (!token) return
    const res = await fetch(`/api/articles/${slug}/comments?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) await fetchComments()
  }

  const displayName = (comment: CommentItem) => {
    if (comment.author) return comment.author.username
    return comment.guestName || '匿名'
  }

  const isGuest = (comment: CommentItem) => !comment.author

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">评论 ({comments.length})</h2>

      <div className="mb-6">
        {!isAuthenticated && (
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="你的昵称"
            maxLength={20}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="写下你的评论..."
          rows={3}
          maxLength={500}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            onClick={() => submitComment(content, undefined, guestName)}
            disabled={submitting || !content.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {submitting ? '提交中...' : '发表评论'}
          </button>
          {!isAuthenticated && (
            <span className="text-xs text-gray-400">以游客身份评论</span>
          )}
        </div>
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
                  <span className={`font-medium ${isGuest(comment) ? 'text-orange-600' : 'text-gray-800'}`}>
                    {displayName(comment)}
                  </span>
                  {isGuest(comment) && (
                    <span className="ml-1 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">游客</span>
                  )}
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
                  {isAuthenticated && (
                    <button
                      onClick={() => removeComment(comment.id)}
                      className="text-red-600 hover:underline"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>

              {replyingTo === comment.id && (
                <div className="mt-3 ml-4">
                  {!isAuthenticated && (
                    <input
                      value={replyGuestName}
                      onChange={(e) => setReplyGuestName(e.target.value)}
                      placeholder="你的昵称"
                      maxLength={20}
                      className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  )}
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="写下你的回复..."
                    rows={2}
                    maxLength={500}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => submitComment(replyContent, comment.id, replyGuestName)}
                      disabled={submitting || !replyContent.trim()}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-60"
                    >
                      提交回复
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null)
                        setReplyContent('')
                        setReplyGuestName('')
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
                        <span className={`font-medium ${isGuest(reply) ? 'text-orange-600' : 'text-gray-700'}`}>
                          {displayName(reply)}
                        </span>
                        {isGuest(reply) && (
                          <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-xs text-orange-600">游客</span>
                        )}
                        <span className="ml-2">{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{reply.content}</p>
                      {isAuthenticated && (
                        <button
                          onClick={() => removeComment(reply.id)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          删除
                        </button>
                      )}
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
