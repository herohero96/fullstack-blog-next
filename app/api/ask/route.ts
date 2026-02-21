import { NextRequest } from 'next/server'
import { searchSimilarChunks, embedArticle } from '@/lib/embedding'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { articleId, question } = await req.json()

    if (!articleId || !question) {
      return Response.json({ error: '缺少 articleId 或 question' }, { status: 400 })
    }

    // 检查文章是否已有 embedding，没有则自动生成
    const existingCount = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM "ArticleEmbedding" WHERE "articleId" = ${Number(articleId)}
    `
    if (Number(existingCount[0].count) === 0) {
      const article = await prisma.article.findUnique({
        where: { id: Number(articleId) },
        select: { content: true },
      })
      if (!article) {
        return Response.json({ error: '文章不存在' }, { status: 404 })
      }
      await embedArticle(Number(articleId), article.content)
    }

    // 向量检索最相似的 3 个文本块
    const chunks = await searchSimilarChunks(Number(articleId), question, 3)
    const context = chunks.map((c, i) => `[片段${i + 1}] ${c.chunkText}`).join('\n\n')

    // 调用 Claude API 流式回答
    const apiBase = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || ''

    const claudeRes = await fetch(`${apiBase}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        stream: true,
        messages: [
          {
            role: 'user',
            content: `你是一个博客文章问答助手。根据以下文章片段回答用户的问题。如果片段中没有相关信息，请如实说明。

文章片段：
${context}

用户问题：${question}`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return Response.json({ error: `Claude API 错误: ${err}` }, { status: 502 })
    }

    // 转发 SSE 流
    return new Response(claudeRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('Ask API error:', e)
    const message = e instanceof Error ? e.message : '服务器错误'
    return Response.json({ error: message }, { status: 500 })
  }
}
