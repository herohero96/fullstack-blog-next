import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// PATCH /api/articles/[id]/publish
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ error: '请先登录' }, { status: 401 })
    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: '登录已过期' }, { status: 401 })

    const { id } = await params
    const articleId = parseInt(id)
    if (isNaN(articleId)) return NextResponse.json({ error: '无效的文章 ID' }, { status: 400 })

    const article = await prisma.article.update({
      where: { id: articleId },
      data: { published: true },
    })

    return NextResponse.json({ ok: true, slug: article.slug })
  } catch (error) {
    console.error('Failed to publish article:', error)
    return NextResponse.json({ error: '发布失败' }, { status: 500 })
  }
}
