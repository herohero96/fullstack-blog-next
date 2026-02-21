import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST /api/articles/[slug]/view — increment view count
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const article = await prisma.article.findUnique({ where: { slug } })
    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 })
    }
    const updated = await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    })
    return NextResponse.json({ viewCount: updated.viewCount })
  } catch (error) {
    console.error('Failed to increment view count:', error)
    return NextResponse.json({ message: 'Failed to increment view count' }, { status: 500 })
  }
}
