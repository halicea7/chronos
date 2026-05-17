import React, { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../lib/ollama'
import { IconCopy, IconCheck } from './Icons'
import { useTheme } from '../lib/ThemeContext'

interface Props {
  message: Message
  isLastStreaming: boolean
}

export function MessageBubble({ message, isLastStreaming }: Props) {
  const isUser = message.role === 'user'
  const hasThinking = !!message.thinking
  const streamingThinking = isLastStreaming && hasThinking && !message.content

  return (
    <div className={`chr-bubble-row ${isUser ? 'user' : 'assistant'}`}>
      {message.image && (
        <img src={message.image} alt="attached" className="chr-bubble-image" />
      )}
      <div className={`chr-bubble ${isUser ? 'chr-bubble-user' : 'chr-bubble-assistant'}`}>
        {hasThinking && (
          <ThinkingBlock text={message.thinking!} streaming={streamingThinking} />
        )}
        {isUser ? (
          <span className="chr-bubble-text">{message.content}</span>
        ) : (
          <MarkdownContent text={message.content} streaming={isLastStreaming} />
        )}
        {isLastStreaming && !streamingThinking && <span className="chr-caret" />}
      </div>
      {!isUser && message.content && !isLastStreaming && (
        <CopyButton text={message.content} className="chr-copy-btn" />
      )}
    </div>
  )
}

function CopyButton({ text, className }: { text: string; className: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button className={className} onClick={copy} title="Copy">
      {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
    </button>
  )
}

function MarkdownContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const theme = useTheme()
  const prismStyle = theme === 'dark' ? oneDark : oneLight

  // Throttle ReactMarkdown re-parses to ~7fps while streaming.
  // The parent updates at 60fps; running a full markdown parse each frame OOMs the renderer.
  const [renderedText, setRenderedText] = useState(text)
  const latestRef = useRef(text)
  latestRef.current = text

  useEffect(() => {
    if (!streaming) return
    setRenderedText(latestRef.current)
    const id = setInterval(() => setRenderedText(latestRef.current), 150)
    return () => clearInterval(id)
  }, [streaming])

  useEffect(() => {
    if (!streaming) setRenderedText(text)
  }, [text, streaming])

  if (!renderedText) return null

  return (
    <div className="chr-md">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // In react-markdown v10 the `inline` prop is gone.
        // Distinguish block vs inline by className (fenced blocks get language-xxx)
        // or by whether children contains a newline (fenced block without language).
        code({ className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const raw = String(children)
          const code = raw.replace(/\n$/, '')

          if (match) {
            // Fenced code block with language specifier
            return (
              <div className="chr-code-block">
                <div className="chr-code-header">
                  <span className="chr-code-lang">{match[1]}</span>
                  <CodeCopyButton code={code} />
                </div>
                <SyntaxHighlighter
                  style={prismStyle}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, borderRadius: '0 0 6px 6px', fontSize: 12, lineHeight: 1.5 }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            )
          }

          if (raw.includes('\n')) {
            // Fenced code block with no language — plain pre/code, no Prism
            return (
              <div className="chr-code-block">
                <div className="chr-code-header">
                  <span className="chr-code-lang">code</span>
                  <CodeCopyButton code={code} />
                </div>
                <pre style={{ margin: 0, padding: '10px 14px', fontSize: 12, lineHeight: 1.5, overflowX: 'auto' }}>
                  <code>{code}</code>
                </pre>
              </div>
            )
          }

          // Inline code
          return <code className="chr-inline-code" {...props}>{children}</code>
        },
      }}
    >
      {renderedText}
    </ReactMarkdown>
    </div>
  )
}

function CodeCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button className="chr-code-copy" onClick={copy} title="Copy code">
      {copied ? <IconCheck size={10} /> : <IconCopy size={10} />}
    </button>
  )
}

function ThinkingBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(streaming)

  React.useEffect(() => {
    if (streaming) setOpen(true)
  }, [streaming])

  return (
    <div className={`chr-thinking${open ? ' chr-thinking-open' : ''}`}>
      <button className="chr-thinking-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="chr-thinking-chevron">{open ? '▾' : '▸'}</span>
        <span>Reasoning</span>
        {streaming && <span className="chr-caret" style={{ marginLeft: 4 }} />}
      </button>
      {open && (
        <div className="chr-thinking-body">
          <pre className="chr-thinking-text">{text}</pre>
        </div>
      )}
    </div>
  )
}
