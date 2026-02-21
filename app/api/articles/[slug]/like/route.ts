import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// GET /api/articles/[slug]/like — get like status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!article) return NextResponse.json({ message: 'Article not found' }, { status: 404 })

    const count = await prisma.like.count({ where: { articleId: article.id } })

    const token = getTokenFromHeader(req.headers.get('authorization'))
    let liked = false
    if (token) {
      try {
        const user = await verifyToken(token)
        liked = !!(await prisma.like.findUnique({
          where: { articleId_userId: { articleId: article.id, userId: user.userId } },
        }))
      } catch {}
    }

    return NextResponse.json({ liked, count })
  } catch (error) {
    console.error('Failed to get like status:', error)
    return NextResponse.json({ message: 'Failed to get like status' }, { status: 500 })
  }
}

// POST /api/articles/[slug]/like — toggle like
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await verifyToken(token)
    const { slug } = await params

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!article) return NextResponse.json({ message: 'Article not found' }, { status: 404 })

    const existing = await prisma.like.findUnique({
      where: { articleId_userId: { articleId: article.id, userId: user.userId } },
    })

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } })
      const count = await prisma.like.count({ where: { articleId: article.id } })
      return NextResponse.json({ liked: false, count })
    } else {
      await prisma.like.create({ data: { articleId: article.id, userId: user.userId } })
      const count = await prisma.like.count({ where: { articleId: article.id } })
      return NextResponse.json({ liked: true, count })
    }
  } catch (error) {
    console.error('Failed to toggle like:', error)
    return NextResponse.json({ message: 'Failed to toggle like' }, { status: 500 })
  }
}
