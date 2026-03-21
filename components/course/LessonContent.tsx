// components/course/LessonContent.tsx
'use client'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface LessonContentProps {
  content: string
  onTypingChange?: (isTyping: boolean) => void
}

export function LessonContent({ content, onTypingChange }: LessonContentProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    onTypingChange?.(true)
    let i = 0
    const interval = setInterval(() => {
      i += 4
      setDisplayed(content.slice(0, i))
      if (i >= content.length) {
        clearInterval(interval)
        onTypingChange?.(false)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [content])

  return (
    <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ background: '#080e08', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-raised px-1 rounded text-accent text-xs" {...props}>{children}</code>
            )
          },
          h1: ({ children }) => <h1 className="text-lg font-bold text-text-primary mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold text-text-primary mb-2 mt-4">{children}</h2>,
          p: ({ children }) => <p className="mb-3 text-text-secondary leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
        }}
      >
        {displayed}
      </ReactMarkdown>
      {displayed.length < content.length && (
        <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
      )}
    </div>
  )
}
