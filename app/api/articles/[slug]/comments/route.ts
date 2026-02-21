import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { createAIReply } from '@/lib/ai-reply'

const authorSelect = { id: true, username: true }

// GET /api/articles/[slug]/comments
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
    if (!article) return NextResponse.json({ message: '文章不存在' }, { status: 404 })

    const comments = await prisma.comment.findMany({
      where: { articleId: article.id, parentId: null },
      include: {
        author: { select: authorSelect },
        replies: {
          include: { author: { select: authorSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json({ message: '获取评论失败' }, { status: 500 })
  }
}

// POST /api/articles/[slug]/comments
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
    if (!article) return NextResponse.json({ message: '文章不存在' }, { status: 404 })

    const body = await req.json()
    const { content, parentId } = body

    if (!content?.trim()) {
      return NextResponse.json({ message: '评论内容不能为空' }, { status: 400 })
    }

    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, articleId: article.id, parentId: null },
      })
      if (!parent) return NextResponse.json({ message: '父评论不存在' }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        articleId: article.id,
        authorId: user.userId,
        parentId: parentId || null,
      },
      include: {
        author: { select: authorSelect },
        replies: { include: { author: { select: authorSelect } } },
      },
    })

    // 异步触发 AI 自动回复（仅顶级评论，不阻塞响应）
    if (!parentId) {
      createAIReply(article.id, comment.id, content).catch(() => {})
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json({ message: '创建评论失败' }, { status: 500 })
  }
}

// DELETE /api/articles/[slug]/comments?id=<commentId>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization'))
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await verifyToken(token)
    await params // consume params (not needed for delete by id)

    const { searchParams } = req.nextUrl
    const id = parseInt(searchParams.get('id') || '')
    if (isNaN(id)) return NextResponse.json({ message: '无效的评论 ID' }, { status: 400 })

    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) return NextResponse.json({ message: '评论不存在' }, { status: 404 })

    const isOwner = comment.authorId === user.userId
    const isAdmin = user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: '无权删除此评论' }, { status: 403 })
    }

    await prisma.comment.delete({ where: { id } })
    return NextResponse.json({ message: '评论已删除' })
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return NextResponse.json({ message: '删除评论失败' }, { status: 500 })
  }
}
