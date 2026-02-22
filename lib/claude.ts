/**
 * 公共 Claude API 调用模块，支持模型优先级自动切换
 */

const MODEL_PRIORITY = [
  'claude-sonnet-4-6',
  'claude-sonnet-4-5-20250929',
  'gpt-5.3-codex',
]

const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
const ANTHROPIC_AUTH_TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || ''

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 调用 Claude API，自动按优先级尝试模型，model_not_found 时切换下一个
 */
export async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  stream = false,
  maxTokens = 2048
): Promise<Response> {
  let lastError: Error | null = null

  for (const model of MODEL_PRIORITY) {
    try {
      const body: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        stream,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      }
      if (systemPrompt) body.system = systemPrompt

      const res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_AUTH_TOKEN,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errText = await res.text()
        // model_not_found → try next model
        if (res.status === 404 || errText.includes('model_not_found') || errText.includes('not found') || errText.includes('No healthy provider') || errText.includes('no available')) {
          console.warn(`Model ${model} not found, trying next...`)
          lastError = new Error(`model_not_found: ${model}`)
          continue
        }
        // Other errors: return as-is
        return res
      }

      return res
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      console.warn(`Model ${model} failed:`, lastError.message)
    }
  }

  // All models exhausted
  throw lastError || new Error('All models exhausted')
}
