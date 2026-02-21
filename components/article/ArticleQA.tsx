'use client'

import { useState, useRef } from 'react'

interface ArticleQAProps {
  articleId: number
}

export default function ArticleQA({ articleId }: ArticleQAProps) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleAsk = async () => {
    const q = question.trim()
    if (!q || loading) return

    setAnswer('')
    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, question: q }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }))
        setAnswer(`错误：${err.error || '请求失败'}`)
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setAnswer('错误：无法读取响应流')
        setLoading(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text
              setAnswer(fullText)
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setAnswer(`错误：${e.message || '请求失败'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">AI 文章问答</h3>
      <p className="text-sm text-gray-500 mb-4">对这篇文章有疑问？输入问题，AI 会基于文章内容为你解答。</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你的问题..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? '思考中...' : '提问'}
        </button>
      </div>

      {answer && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  )
}
