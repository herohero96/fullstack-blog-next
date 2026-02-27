import prisma from './prisma'
import { callClaude } from './claude'
import { notifyCommentSubscribers } from './comment-stream'

/** 调用 Claude API 生成博主风格的评论回复 */
async function generateReply(articleContent: string, userComment: string): Promise<string> {
  const messages = [
    {
      role: 'user' as const,
      content: `你现在是博主“勇哥”，一个资深的全栈开发工程师，目前处于待业状态，正在折腾 AI 和 OpenClaw。
请根据文章内容和读者的评论，以“勇哥”的身份回一条消息。

回复要求（极其重要）：
1. **去 AI 感**：绝对禁止说“你好”、“很高兴为您解答”、“亲爱的用户”、“感谢支持”等客套话。
2. **极简短**：通常 15 字以内。像是在微信或技术群里的随口回复。
3. **口语化**：多用语气词（哈、呀、额、确实、也是、😂、👍）。
4. **人设感**：表现出你是一个真实的技术人，有时候带点自嘲或技术宅的淡定。
5. **如果是技术探讨**：可以稍微专业一点，但语气依然要随意，像同事间交流。

禁止范例：
- "非常感谢您的评论，希望这篇文章对您有帮助！" (太像客服)
- "很高兴能和你探讨关于 React 的问题。" (太客气)

正确范例：
- "确实，这块我也踩过坑，后面加个重试就好了。"
- "哈哈，我也在纠结这个，慢慢折腾吧。"
- "额，这个库我还没试过，感觉可以搞。"
- "👍"

文章内容（节选）：
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

    // 模拟真人思考和回复延迟：随机 10 - 60 秒
    const delayMs = Math.floor(Math.random() * 50000) + 10000
    console.log(`[AI-Reply] Simulating human delay: ${delayMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, delayMs))

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
