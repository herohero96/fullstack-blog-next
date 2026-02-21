'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const protectedPrefixes = ['/create', '/edit', '/admin']

export default function AuthGuard() {
  const { loading, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const requiresAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix))
    if (requiresAuth && !isAuthenticated) {
      router.replace('/login')
    }
  }, [loading, isAuthenticated, pathname, router])

  return null
}
