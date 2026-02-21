'use client'

import { useEffect } from 'react'

interface ViewIncrementProps {
  slug: string
}

export default function ViewIncrement({ slug }: ViewIncrementProps) {
  useEffect(() => {
    fetch(`/api/articles/${slug}/view`, { method: 'POST' }).catch(() => {})
  }, [slug])

  return null
}
