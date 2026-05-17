import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useSettings } from './hooks/useSettings'
import { useChat } from './hooks/useChat'
import { useKeyboard } from './hooks/useKeyboard'
import { useConversations } from './hooks/useConversations'
import { useSeraphContext } from './hooks/useSeraphContext'
import { ThemeContext } from './lib/ThemeContext'
import { resolveChipContext } from './lib/seraph'
import { MessageBubble } from './components/MessageBubble'
import { InputBar } from './components/InputBar'
import { ModelPicker } from './components/ModelPicker'
import { SettingsPanel } from './components/SettingsPanel'
import { MoireBackground } from './components/MoireBackground'
import { Sidebar } from './components/Sidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ContextBar } from './components/ContextChip'
import {
  ChronosMark,
  IconLock,
  IconTrash,
  IconSettings,
  IconClose,
  IconWarn,
  IconConversations,
} from './components/Icons'

function makeSession() {
  const hex = '0123456789abcdef'
  let s = '0x'
  for (let i = 0; i < 4; i++) s += hex[Math.floor(Math.random() * 16)]
  return s
}

export default function App() {
  const { settings, update, loaded } = useSettings()
  const activeHost = loaded
    ? (settings.ollamaMode === 'external' ? settings.ollamaHostExternal : settings.ollamaHost)
    : ''

  const {
    models, selectedModel, selectModel, visionSupported,
    thinkingSupported, thinkingEnabled, toggleThinking,
    messages, isStreaming, error, connected,
    send, cancel, clearHistory, loadMessages,
  } = useChat(activeHost, settings.persistHistory)

  const {
    conversations, activeId,
    saveConversation, switchConversation, newConversation, deleteConversation,
  } = useConversations()

  const {
    chips, addChip, removeChip, clearChips,
    mention, handleTextChange, closeMention, consumeMention,
  } = useSeraphContext()

  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  const session = useMemo(makeSession, [])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist conversation once streaming finishes.
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      saveConversation(messages)
    }
  }, [isStreaming, messages, saveConversation])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false)
        else window.api.hideWindow()
      }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [showSettings])

  const handleClear = useCallback(() => { clearHistory(); newConversation(); clearChips() }, [clearHistory, newConversation, clearChips])

  const handleSend = useCallback((text: string, image?: string) => {
    if (chips.length > 0) {
      const context = chips.map(resolveChipContext).join('\n\n')
      const fullText = `${context}\n\n---\n\n${text}`
      send(fullText, image)
      clearChips()
    } else {
      send(text, image)
    }
  }, [chips, send, clearChips])
  const handleSettings = useCallback(() => setShowSettings(true), [])
  useKeyboard({ onClear: handleClear, onSettings: handleSettings })

  function handleSelectConversation(id: string) {
    const msgs = switchConversation(id)
    loadMessages(msgs)
    setShowSidebar(false)
  }

  function handleNewConversation() {
    clearHistory()
    newConversation()
    setShowSidebar(false)
  }

  const theme =
    settings.appearance === 'system'
      ? (systemDark ? 'dark' : 'light')
      : settings.appearance

  const connectionState =
    connected === null ? 'warn' : connected ? 'ok' : 'err'

  const platform = window.api.platform

  return (
    <ThemeContext.Provider value={theme}>
    <div className="chr" data-variant={settings.variant ?? 'tactical'} data-theme={theme}>
      {/* Drag handle */}
      <div className="chr-drag">
        <ChronosMark size={13} />
        <div className="chr-drag-dots"><span /><span /><span /></div>
        <span className="chr-session" title="Session ID">{session}</span>
      </div>

      {/* Toolbar */}
      <div className="chr-toolbar">
        <ModelPicker
          models={models}
          selected={selectedModel}
          visionActive={visionSupported}
          onSelect={selectModel}
          mode={settings.ollamaMode}
          externalHost={settings.ollamaHostExternal}
          onModeChange={(m) => update('ollamaMode', m)}
        />

        <div className="chr-toolbar-spacer" />

        <div className="chr-status" data-state={connectionState}>
          <span className="chr-status-dot" />
          {connected && <><IconLock size={9} /><span>local · secure</span></>}
          {connected === null && <span>connecting</span>}
          {connected === false && <span>offline</span>}
        </div>

        <div className="chr-toolbar-spacer" />

        <div className="chr-toolbar-right">
          {messages.length > 0 && (
            <button className="chr-iconbtn" title="Clear history (⌘K)" onClick={handleClear}>
              <IconTrash size={13} />
            </button>
          )}
          <button
            className="chr-iconbtn"
            title="Conversations"
            data-active={showSidebar}
            onClick={() => setShowSidebar((v) => !v)}
          >
            <IconConversations size={13} />
          </button>
          <button
            className="chr-iconbtn"
            title="Settings (⌘,)"
            data-active={showSettings}
            onClick={() => setShowSettings(true)}
          >
            <IconSettings size={14} />
          </button>
          {platform !== 'darwin' && (
            <button
              className="chr-iconbtn"
              title="Hide"
              onClick={() => window.api.hideWindow()}
            >
              <IconClose size={11} />
            </button>
          )}
        </div>
      </div>

      <div className="chr-hairline" />

      {/* Message area */}
      <div className="chr-content">
        <MoireBackground variant={settings.variant ?? 'tactical'} />
        {messages.length === 0 ? (
          connected === false ? (
            <div className="chr-messages">
              <div className="chr-error-card">
                <div className="chr-error-head">
                  <IconWarn size={12} /> Ollama unreachable
                </div>
                <div className="chr-error-msg">
                  {error ?? 'Cannot reach Ollama — is `ollama serve` running?'}
                </div>
                <div className="chr-error-code">$ ollama serve</div>
              </div>
            </div>
          ) : (
            <div className="chr-empty">
              <div className="chr-empty-mark">
                <ChronosMark size={38} />
              </div>
              <div className="chr-empty-title">Ready.</div>
              <div className="chr-empty-sub">
                <span className="chr-empty-kbd">↵</span>
                <span>send</span>
                <span style={{ opacity: 0.35, margin: '0 2px' }}>·</span>
                <span className="chr-empty-kbd">⇧↵</span>
                <span>newline</span>
              </div>
              <div className="chr-empty-meta">
                <span>local</span>
                <span className="dot">·</span>
                <span>no telemetry</span>
                <span className="dot">·</span>
                <span>encrypted</span>
              </div>
            </div>
          )
        ) : (
          <div className="chr-messages">
            <ErrorBoundary>
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isLastStreaming={isStreaming && i === messages.length - 1}
                />
              ))}
            </ErrorBoundary>
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="chr-hairline" />

      <ContextBar chips={chips} onRemove={removeChip} />

      <InputBar
        isStreaming={isStreaming}
        visionSupported={visionSupported}
        thinkingSupported={thinkingSupported}
        thinkingEnabled={thinkingEnabled}
        seraphHost={settings.seraphHost}
        seraphToken={settings.seraphToken}
        onSend={handleSend}
        onCancel={cancel}
        onToggleThinking={toggleThinking}
        mentionOpen={mention.open}
        mentionQuery={mention.query}
        onTextChange={handleTextChange}
        onMentionSelect={addChip}
        onMentionClose={closeMention}
        consumeMention={consumeMention}
      />

      {showSidebar && (
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={deleteConversation}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={update}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
    </ThemeContext.Provider>
  )
}
