'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // 添加空的 assistant 消息用于流式填充
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: '请求失败' }))
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: `错误: ${data.error || '请求失败'}` }
          return copy
        })
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                copy[copy.length - 1] = { ...last, content: last.content + parsed.delta.text }
                return copy
              })
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: '网络错误，请稍后重试' }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110"
          aria-label="打开 AI 助手"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* 对话框 */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* 标题栏 */}
          <div className="flex items-center justify-between rounded-t-2xl bg-blue-600 px-4 py-3 text-white">
            <span className="text-sm font-medium">AI 助手</span>
            <div className="flex gap-2">
              <button
                onClick={() => setMessages([])}
                className="rounded px-2 py-0.5 text-xs hover:bg-blue-700"
                title="清空对话"
              >
                清空
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded px-2 py-0.5 text-xs hover:bg-blue-700"
                title="关闭"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 消息列表 */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-gray-400 mt-8">你好，有什么可以帮你的？</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content || (streaming && i === messages.length - 1 ? '...' : '')}
                </div>
              </div>
            ))}
          </div>

          {/* 输入区 */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                disabled={streaming}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
