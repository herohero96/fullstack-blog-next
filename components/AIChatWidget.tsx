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
  const [showBubble, setShowBubble] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const shown = localStorage.getItem('ai-chat-bubble-shown')
    if (!shown) {
      setShowBubble(true)
      localStorage.setItem('ai-chat-bubble-shown', '1')
      const timer = setTimeout(() => setShowBubble(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

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
            // ignore parse errors
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      sendMessage()
    }
    // plain Enter = newline (default textarea behavior)
  }

  return (
    <>
      {/* 悬浮按钮 + 气泡提示 */}
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {showBubble && !open && (
          <div
            data-testid="chat-bubble"
            className="animate-fade-in mb-2 rounded-xl bg-white px-4 py-2 text-sm text-gray-700 shadow-lg border border-gray-100"
          >
            👋 有问题？问 AI 助手吧！
          </div>
        )}
        {!open && (
          <button
            onClick={() => { setOpen(true); setShowBubble(false) }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-2xl shadow-xl transition-transform duration-200 hover:scale-110"
            aria-label="打开 AI 助手"
            data-testid="chat-fab"
          >
            🤖
          </button>
        )}
      </div>

      {/* 遮罩 */}
      <div
        data-testid="chat-overlay"
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* 右侧抽屉 */}
      <div
        data-testid="chat-drawer"
        className={`fixed right-0 top-0 z-50 flex h-full w-96 max-w-[90vw] flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between bg-blue-600 px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-lg">🤖</span>
            <span className="font-medium">AI 助手</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMessages([])}
              className="rounded-lg px-3 py-1 text-xs hover:bg-white/20 transition-colors"
              title="清空对话"
            >
              清空
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-white/20 transition-colors"
              title="关闭"
              data-testid="chat-close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-3xl mb-3">🤖</span>
              <p className="text-sm">你好，有什么可以帮你的？</p>
              <p className="text-xs mt-1">我了解这个博客的所有文章内容</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <span className="mr-2 mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm">🤖</span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 border border-blue-100 text-gray-800'
                }`}
              >
                {msg.content || (streaming && i === messages.length - 1 ? '...' : '')}
              </div>
            </div>
          ))}
        </div>

        {/* 输入区 */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息... (Ctrl+Enter 发送，Enter 换行)"
              disabled={streaming}
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 pb-10 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              data-testid="chat-send"
              className="absolute bottom-2 right-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm text-white disabled:opacity-50 transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
