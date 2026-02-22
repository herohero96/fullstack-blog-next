import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { subscribe, unsubscribe } from '@/lib/comment-stream'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const article = await prisma.article.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (!article) {
    return Response.json({ error: '文章不存在' }, { status: 404 })
  }

  const articleId = article.id
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sub = subscribe(articleId, controller)

      // 心跳 ping 每 30 秒
      const heartbeat = setInterval(() => {
        if (sub.closed) {
          clearInterval(heartbeat)
          return
        }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(heartbeat)
          unsubscribe(articleId, sub)
        }
      }, 30_000)

      // 客户端断开时清理
      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe(articleId, sub)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
