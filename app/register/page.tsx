'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await register(username, email, password)
      setSuccess(true)
      setTimeout(() => router.push('/'), 1500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '注册失败，请重试'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">注册</h1>

        {success && (
          <p className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded mb-4">
            注册成功！请等待管理员审核后即可发布文章。
          </p>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入邮箱"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          已有账号？<Link href="/login" className="text-blue-600 hover:underline">去登录</Link>
        </p>
      </div>
    </div>
  )
}
