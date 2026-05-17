import { useState, useRef, KeyboardEvent } from 'react'
import { IconScreenshot, IconSend, IconStop, IconClose, IconBrain } from './Icons'
import { MentionDropdown } from './MentionDropdown'
import type { SeraphChipType } from '../lib/seraph'

interface Props {
  isStreaming: boolean
  visionSupported: boolean
  thinkingSupported: boolean
  thinkingEnabled: boolean
  seraphHost: string
  seraphToken: string
  onSend: (text: string, image?: string) => void
  onCancel: () => void
  onToggleThinking: () => void
  // Mention / context chip integration
  mentionOpen: boolean
  mentionQuery: string
  onTextChange: (text: string, cursorPos: number) => void
  onMentionSelect: (type: SeraphChipType, label: string, data: Record<string, unknown>) => void
  onMentionClose: () => void
  consumeMention: (text: string) => string
}

export function InputBar({
  isStreaming,
  visionSupported,
  thinkingSupported,
  thinkingEnabled,
  seraphHost,
  seraphToken,
  onSend,
  onCancel,
  onToggleThinking,
  mentionOpen,
  mentionQuery,
  onTextChange,
  onMentionSelect,
  onMentionClose,
  consumeMention,
}: Props) {
  const [text, setText] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 || !!pendingImage
  const seraphEnabled = !!(seraphHost && seraphToken)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    if (seraphEnabled) {
      onTextChange(val, el.selectionStart ?? val.length)
    }
  }

  function handleMentionSelect(type: SeraphChipType, label: string, data: Record<string, unknown>) {
    const cleaned = consumeMention(text)
    setText(cleaned)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
    onMentionSelect(type, label, data)
    textareaRef.current?.focus()
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Let the dropdown handle arrow/enter/tab/escape/backspace when open
    if (mentionOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape', 'Backspace'].includes(e.key)) return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    if (!canSend || isStreaming) return
    onSend(text, pendingImage ?? undefined)
    setText('')
    setPendingImage(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    textareaRef.current?.focus()
  }

  async function captureScreen() {
    setCapturing(true)
    try {
      const dataUrl = await window.api.captureRegion()
      if (dataUrl) setPendingImage(dataUrl)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="chr-inputbar" style={{ position: 'relative' }}>
      {/* Mention dropdown — floats above the input bar */}
      {mentionOpen && seraphEnabled && (
        <MentionDropdown
          host={seraphHost}
          token={seraphToken}
          query={mentionQuery}
          onSelect={handleMentionSelect}
          onClose={onMentionClose}
        />
      )}

      {pendingImage && (
        <div className="chr-pending">
          <img src={pendingImage} alt="screenshot" />
          <span className="chr-pending-label">screenshot</span>
          <button className="chr-pending-close" onClick={() => setPendingImage(null)}>
            <IconClose size={7} />
          </button>
        </div>
      )}
      <div className="chr-composer">
        {visionSupported && (
          <button
            className="chr-iconbtn"
            title="Capture screen"
            disabled={capturing || !!pendingImage}
            onClick={captureScreen}
          >
            <IconScreenshot size={14} />
          </button>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={isStreaming ? 'Generating…' : seraphEnabled ? 'Ask anything · @ to reference Seraph' : 'Ask anything · ⌘K'}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKey}
          onBlur={() => {
            // Delay close so dropdown clicks can register
            setTimeout(onMentionClose, 150)
          }}
        />
        {thinkingSupported && (
          <button
            className="chr-iconbtn chr-think-btn"
            title={thinkingEnabled ? 'Thinking on — click to disable' : 'Thinking off — click to enable'}
            data-active={thinkingEnabled}
            onClick={onToggleThinking}
          >
            <IconBrain size={17} />
            <span className="chr-think-label">Think</span>
          </button>
        )}
        <button
          className="chr-send"
          data-stop={isStreaming}
          disabled={!isStreaming && !canSend}
          onClick={isStreaming ? onCancel : submit}
          title={isStreaming ? 'Stop' : 'Send'}
        >
          {isStreaming ? <IconStop size={9} /> : <IconSend size={12} />}
        </button>
      </div>
    </div>
  )
}
