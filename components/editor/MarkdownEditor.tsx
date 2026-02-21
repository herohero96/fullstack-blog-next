'use client'

import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const toolbarActions = [
  { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
  { label: 'I', title: 'Italic', prefix: '_', suffix: '_' },
  { label: 'H1', title: 'Heading 1', prefix: '# ', suffix: '' },
  { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
  { label: 'H3', title: 'Heading 3', prefix: '### ', suffix: '' },
  { label: 'Link', title: 'Link', prefix: '[', suffix: '](url)' },
  { label: 'Code', title: 'Inline Code', prefix: '`', suffix: '`' },
  { label: '```', title: 'Code Block', prefix: '```\n', suffix: '\n```' },
  { label: 'UL', title: 'Unordered List', prefix: '- ', suffix: '' },
  { label: 'OL', title: 'Ordered List', prefix: '1. ', suffix: '' },
  { label: '> ', title: 'Blockquote', prefix: '> ', suffix: '' },
]

export default function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertText = useCallback(
    (prefix: string, suffix: string) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selected = value.substring(start, end)
      const newText = value.substring(0, start) + prefix + selected + suffix + value.substring(end)
      onChange(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        const cursorPos = start + prefix.length + selected.length
        textarea.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [value, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2)
      })
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-300 flex-wrap">
        {toolbarActions.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            onClick={() => insertText(action.prefix, action.suffix)}
            className="px-2 py-1 text-xs font-mono text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            {action.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex border border-gray-300 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1 text-xs ${activeTab === 'edit' ? 'bg-white text-gray-900 font-medium' : 'bg-gray-100 text-gray-500'}`}
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs ${activeTab === 'preview' ? 'bg-white text-gray-900 font-medium' : 'bg-gray-100 text-gray-500'}`}
          >
            预览
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || '使用 Markdown 编写文章内容...'}
            className="w-full min-h-[400px] p-4 font-mono text-sm resize-y focus:outline-none"
          />
        ) : (
          <div className="p-4 prose prose-sm max-w-none">
            {value ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400 italic">暂无内容可预览</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
