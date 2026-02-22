import prisma from './prisma'
import { callClaude } from './claude'
import { notifyCommentSubscribers } from './comment-stream'

/** 调用 Claude API 生成博主风格的评论回复 */
async function generateReply(articleContent: string, userComment: string): Promise<string> {
  const messages = [
    {
      role: 'user' as const,
      content: `你是一位友好的博客博主。请根据文章内容和读者的评论，生成一条简短、自然、友好的回复。
回复要求：
- 直接回复内容，不要加任何前缀或署名
- 结合文章内容，体现你对主题的理解
- 语气亲切自然，像朋友聊天
- 控制在 2-3 句话以内

文章内容（节选前1000字）：
${articleContent.slice(0, 1000)}

读者评论：
${userComment}`,
    },
  ]

  const res = await callClaude(messages, undefined, false, 512)

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.content[0]?.text || ''
}

/** 异步生成 AI 回复并以博主身份插入为子评论 */
export async function createAIReply(articleId: number, commentId: number, userComment: string) {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    })
    if (!admin) return

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { content: true },
    })
    if (!article) return

    const replyText = await generateReply(article.content, userComment)
    if (!replyText.trim()) return

    await prisma.comment.create({
      data: {
        content: replyText,
        articleId,
        authorId: admin.id,
        parentId: commentId,
      },
    })

    // SSE 推送 AI 回复
    notifyCommentSubscribers(articleId, {
      id: 0, // 客户端会重新 fetch 完整列表
      content: replyText,
      authorId: admin.id,
      guestName: null,
      parentId: commentId,
      createdAt: new Date().toISOString(),
      author: { id: admin.id, username: 'admin' },
    })
  } catch (error) {
    console.error('AI auto-reply failed:', error)
  }
}
