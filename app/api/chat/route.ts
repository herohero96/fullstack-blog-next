import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY || ''
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || ''

async function getQueryEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ model: 'voyage-3', input: [text], input_type: 'query' }),
  })
  if (!res.ok) throw new Error(`Voyage API error: ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

interface SimilarArticle {
  id: number
  title: string
  content: string
  slug: string
  distance: number
}

async function searchSimilarArticles(queryEmbedding: number[], limit = 3): Promise<SimilarArticle[]> {
  const vectorStr = `[${queryEmbedding.join(',')}]`
  return prisma.$queryRawUnsafe<SimilarArticle[]>(
    `SELECT id, title, content, slug, embedding <=> $1::vector AS distance
     FROM "Article"
     WHERE embedding IS NOT NULL AND published = true
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vectorStr,
    limit
  )
}

async function getArticleGraph(articleIds: number[]) {
  if (articleIds.length === 0) return { relations: [], concepts: [] }

  const relations = await prisma.articleRelation.findMany({
    where: {
      OR: [
        { fromId: { in: articleIds } },
        { toId: { in: articleIds } },
      ],
    },
    include: {
      from: { select: { id: true, title: true, slug: true } },
      to: { select: { id: true, title: true, slug: true } },
    },
  })

  const concepts = await prisma.articleConcept.findMany({
    where: { articleId: { in: articleIds } },
    include: {
      concept: { select: { name: true, type: true } },
    },
  })

  return { relations, concepts }
}

async function buildSystemPrompt(query: string): Promise<string> {
  const baseBio = `你是「何夕的技术博客」的 AI 助手。这个博客主要分享 Claude Code、AI 编程、全栈开发等技术内容。你的任务是基于博客文章内容回答用户问题，推荐相关文章，并提供技术建议。回答简洁明了，语气亲切自然。`

  // 获取所有文章标题列表
  const allArticles = await prisma.article.findMany({
    where: { published: true },
    select: { title: true, slug: true },
    orderBy: { createdAt: 'desc' },
  })
  const titleList = allArticles.map((a) => `- ${a.title}`).join('\n')

  // 尝试向量检索
  let contextSection = ''
  try {
    const embedding = await getQueryEmbedding(query)
    const similar = await searchSimilarArticles(embedding, 3)

    if (similar.length > 0) {
      const articleIds = similar.map((a) => a.id)
      const { relations, concepts } = await getArticleGraph(articleIds)

      // 相关文章全文
      const articlesContext = similar
        .map((a, i) => `### 相关文章 ${i + 1}: ${a.title}\n${a.content}`)
        .join('\n\n---\n\n')

      // 图谱信息
      const prerequisiteInfo = relations
        .filter((r) => r.type === 'PREREQUISITE')
        .map((r) => `「${r.from.title}」是「${r.to.title}」的前置知识`)
      const seriesInfo = relations
        .filter((r) => r.type === 'SERIES')
        .map((r) => `「${r.from.title}」和「${r.to.title}」属于同一系列`)
      const conceptInfo = concepts
        .map((c) => `${c.concept.name} (${c.concept.type})`)
      const uniqueConcepts = [...new Set(conceptInfo)]

      let graphSection = ''
      if (prerequisiteInfo.length > 0) {
        graphSection += `\n前置知识关系：\n${prerequisiteInfo.join('\n')}`
      }
      if (seriesInfo.length > 0) {
        graphSection += `\n系列文章关系：\n${[...new Set(seriesInfo)].join('\n')}`
      }
      if (uniqueConcepts.length > 0) {
        graphSection += `\n涉及技术概念：${uniqueConcepts.join('、')}`
      }

      contextSection = `\n\n## 与用户问题最相关的文章内容\n\n${articlesContext}\n\n## 知识图谱信息\n${graphSection}`
    }
  } catch (e) {
    console.error('Vector search failed, falling back:', e)
  }

  return `${baseBio}\n\n## 博客文章列表\n${titleList}${contextSection}\n\n## 回答要求\n- 优先基于上面的文章内容回答\n- 如果问到具体文章，引用文章标题\n- 如果问题与博客内容无关，友好地说明并尽力回答\n- 推荐相关文章时给出文章标题`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body as { messages: ChatMessage[] }

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages 不能为空' }, { status: 400 })
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content?.trim()) {
        return Response.json({ error: '每条消息需包含 role 和 content' }, { status: 400 })
      }
    }

    // 取最新一条 user 消息用于检索
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const systemPrompt = await buildSystemPrompt(lastUserMsg?.content || '')

    const claudeRes = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_AUTH_TOKEN,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return Response.json({ error: `AI 服务暂时不可用: ${err}` }, { status: 502 })
    }

    return new Response(claudeRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e: unknown) {
    console.error('Chat API error:', e)
    const message = e instanceof Error ? e.message : '服务器错误'
    return Response.json({ error: message }, { status: 500 })
  }
}
