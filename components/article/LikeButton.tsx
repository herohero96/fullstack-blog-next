'use client'

import { useEffect, useState } from 'react'

interface LikeButtonProps {
  slug: string
}

export default function LikeButton({ slug }: LikeButtonProps) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

    fetch(`/api/articles/${slug}/like`, { headers })
      .then((res) => res.json())
      .then((data) => {
        setLiked(Boolean(data.liked))
        setCount(Number(data.count ?? 0))
      })
      .catch(() => {})
  }, [slug])

  const handleLike = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      alert('请先登录后再点赞')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/articles/${slug}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setLiked(Boolean(data.liked))
        setCount(Number(data.count ?? 0))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
        liked
          ? 'border-red-300 bg-red-50 text-red-600'
          : 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
      } disabled:opacity-60`}
    >
      <span>{liked ? '❤️' : '🤍'}</span>
      <span>{count} 点赞</span>
    </button>
  )
}
