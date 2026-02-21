'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type UserStatus = 'pending' | 'approved' | 'rejected'

interface User {
  id: number
  username: string
  email: string
  role: string
  status: UserStatus
  createdAt: string
}

const statusTabs: { label: string; value: UserStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const statusBadge: Record<UserStatus, { text: string; className: string }> = {
  pending: { text: '待审核', className: 'bg-yellow-100 text-yellow-700' },
  approved: { text: '已通过', className: 'bg-green-100 text-green-700' },
  rejected: { text: '已拒绝', className: 'bg-red-100 text-red-700' },
}

export default function AdminUsersPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<UserStatus | 'all'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchUsers = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers(data)
    } catch {
      showToast('获取用户列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== 'admin') {
      router.replace('/')
      return
    }
    fetchUsers()
  }, [authLoading, user, router, fetchUsers])

  const handleUpdateStatus = async (id: number, status: UserStatus) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      showToast(status === 'approved' ? '已通过审核' : '已拒绝', 'success')
      fetchUsers()
    } catch {
      showToast('操作失败', 'error')
    }
  }

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`确定要删除用户「${username}」吗？此操作无法撤销。`)) return
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      showToast('用户已删除', 'success')
      fetchUsers()
    } catch {
      showToast('删除失败', 'error')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-200 rounded" />)}
        </div>
      </div>
    )
  }

  const filtered = filter === 'all' ? users : users.filter((u) => u.status === filter)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">用户管理</h1>

      <div className="flex gap-2 mb-6">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无用户</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">用户名</th>
                <th className="pb-3 font-medium">邮箱</th>
                <th className="pb-3 font-medium">角色</th>
                <th className="pb-3 font-medium">状态</th>
                <th className="pb-3 font-medium">注册时间</th>
                <th className="pb-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const badge = statusBadge[u.status]
                return (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">{u.username}</td>
                    <td className="py-3 text-gray-600">{u.email}</td>
                    <td className="py-3 text-gray-600">{u.role === 'admin' ? '管理员' : '用户'}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${badge.className}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {(u.status === 'pending' || u.status === 'rejected') && (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'approved')}
                            className="text-xs text-green-600 hover:underline"
                          >
                            通过
                          </button>
                        )}
                        {u.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(u.id, 'rejected')}
                            className="text-xs text-red-600 hover:underline"
                          >
                            拒绝
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
