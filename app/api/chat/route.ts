import { NextRequest } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        stream: true,
        system: '你是一个友好的博客 AI 助手。你可以帮助用户解答博客内容相关的问题、提供写作建议、讨论技术话题。回答简洁明了，语气亲切自然。如果用户的问题超出你的能力范围，请如实说明。',
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
