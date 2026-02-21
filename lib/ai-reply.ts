import prisma from './prisma'

/** 调用 Claude API 生成博主风格的评论回复 */
async function generateReply(articleContent: string, userComment: string): Promise<string> {
  const apiBase = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
  const apiKey = process.env.ANTHROPIC_AUTH_TOKEN || ''

  const res = await fetch(`${apiBase}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
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
      ],
    }),
  })

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
    // 获取博主账号（role=admin 的第一个用户）
    const admin = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { id: true },
    })
    if (!admin) return

    // 获取文章内容
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
  } catch (error) {
    console.error('AI auto-reply failed:', error)
  }
}
