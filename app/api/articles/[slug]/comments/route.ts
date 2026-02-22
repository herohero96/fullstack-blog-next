import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { createAIReply } from '@/lib/ai-reply'
import { notifyCommentSubscribers } from '@/lib/comment-stream'

const authorSelect = { id: true, username: true }

// 简易 IP 限流：同一 IP 每分钟最多 3 条评论
const ipTimestamps = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 60_000 // 1 分钟
  const limit = 3
  const timestamps = ipTimestamps.get(ip)?.filter((t) => now - t < window) ?? []
  if (timestamps.length >= limit) return false
  timestamps.push(now)
  ipTimestamps.set(ip, timestamps)
  return true
}

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
    const { slug } = await params

    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!article) return NextResponse.json({ message: '文章不存在' }, { status: 404 })

    // 解析登录状态（可选）
    const token = getTokenFromHeader(req.headers.get('authorization'))
    let userId: number | null = null
    if (token) {
      try {
        const user = await verifyToken(token)
        userId = user.userId
      } catch {
        // token 无效，当作游客处理
      }
    }

    const body = await req.json()
    const { content, parentId, guestName } = body

    // 内容长度限制 1-500 字
    const trimmed = content?.trim() ?? ''
    if (!trimmed || trimmed.length > 500) {
      return NextResponse.json({ message: '评论内容需在 1-500 字之间' }, { status: 400 })
    }

    // 游客必须提供昵称
    if (!userId) {
      const name = guestName?.trim() ?? ''
      if (name.length < 2 || name.length > 20) {
        return NextResponse.json({ message: '游客昵称需在 2-20 字之间' }, { status: 400 })
      }
    }

    // IP 限流
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ message: '评论过于频繁，请稍后再试' }, { status: 429 })
    }

    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, articleId: article.id, parentId: null },
      })
      if (!parent) return NextResponse.json({ message: '父评论不存在' }, { status: 400 })
    }

    const comment = await prisma.comment.create({
      data: {
        content: trimmed,
        articleId: article.id,
        authorId: userId,
        guestName: userId ? null : guestName?.trim(),
        parentId: parentId || null,
      },
      include: {
        author: { select: authorSelect },
        replies: { include: { author: { select: authorSelect } } },
      },
    })

    // SSE 推送新评论
    notifyCommentSubscribers(article.id, {
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      guestName: comment.guestName,
      parentId: comment.parentId,
      createdAt: comment.createdAt.toISOString(),
      author: comment.author,
    })

    // 先返回评论，再等待 AI 自动回复（Vercel Serverless 需要 await，否则进程提前结束）
    const response = NextResponse.json(comment, { status: 201 })
    if (!parentId) {
      await createAIReply(article.id, comment.id, trimmed).catch(() => {})
    }
    return response
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
