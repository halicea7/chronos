import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchModels,
  fetchModelDetails,
  streamChat,
  type OllamaModel,
  type Message,
} from '../lib/ollama'

const HISTORY_KEY = 'chronos:history'

let msgCounter = 0
function uid() {
  return `msg-${Date.now()}-${++msgCounter}`
}

export function useChat(host: string, persistHistory: boolean, systemPrompt?: string) {
  const [models, setModels] = useState<OllamaModel[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [visionSupported, setVisionSupported] = useState(false)
  const [thinkingSupported, setThinkingSupported] = useState(false)
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])

  function setMsgs(updater: Message[] | ((prev: Message[]) => Message[])) {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      messagesRef.current = next
      return next
    })
  }
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>([])
  const historyLoadedRef = useRef(false)
  const systemPromptRef = useRef(systemPrompt)
  useEffect(() => { systemPromptRef.current = systemPrompt }, [systemPrompt])

  // -------------------------------------------------------------------------
  // History persistence
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!historyLoadedRef.current && persistHistory) {
      historyLoadedRef.current = true
      try {
        const raw = localStorage.getItem(HISTORY_KEY)
        if (raw) setMsgs(JSON.parse(raw))
      } catch {
        /* ignore */
      }
    }
  }, [persistHistory])

  const saveHistory = useCallback(
    (msgs: Message[]) => {
      if (!persistHistory) return
      // Don't persist image data — it's large and session-specific.
      const stripped = msgs.map((m) => ({ ...m, image: undefined }))
      localStorage.setItem(HISTORY_KEY, JSON.stringify(stripped))
    },
    [persistHistory]
  )

  // -------------------------------------------------------------------------
  // Models
  // -------------------------------------------------------------------------

  const loadModels = useCallback(async () => {
    try {
      const list = await fetchModels(host)
      setModels(list)
      setConnected(true)
      setError(null)
      // If the current selection isn't available on this host, pick the first model.
      setSelectedModel((prev) => {
        if (prev && list.some((m) => m.name === prev)) return prev
        return list[0]?.name ?? ''
      })
    } catch {
      setConnected(false)
      setError('Ollama unreachable')
      setModels([])
    }
  }, [host])

  const selectModel = useCallback((name: string) => setSelectedModel(name), [])

  const toggleThinking = useCallback(() => setThinkingEnabled((v) => !v), [])

  // Fetch vision + thinking capability whenever the selected model or host changes.
  useEffect(() => {
    if (!selectedModel || !host) {
      setVisionSupported(false)
      setThinkingSupported(false)
      return
    }
    fetchModelDetails(host, selectedModel).then(({ supportsVision, supportsThinking }) => {
      setVisionSupported(supportsVision)
      setThinkingSupported(supportsThinking)
    })
  }, [selectedModel, host])

  // Initial load + 30-second polling
  useEffect(() => {
    loadModels()
    const id = setInterval(loadModels, 30_000)
    return () => clearInterval(id)
  }, [loadModels])

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  const send = useCallback(
    async (text: string, image?: string) => {
      const trimmed = text.trim()
      if (!trimmed && !image) return
      if (!selectedModel) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const userMsg: Message = { id: uid(), role: 'user', content: trimmed, image }
      const assistantMsg: Message = { id: uid(), role: 'assistant', content: '' }

      const history = [...messagesRef.current, userMsg]
      const withSys: Message[] = systemPromptRef.current
        ? [{ id: 'sys-0', role: 'system', content: systemPromptRef.current }, ...history]
        : history
      setMsgs([...history, assistantMsg])
      setIsStreaming(true)
      const useThink = thinkingEnabled && thinkingSupported

      // Batch token updates to one React render per animation frame (~60fps).
      // Without this, fast models trigger hundreds of reconciles/sec and OOM the renderer.
      let pendingContent = ''
      let pendingThinking = ''
      let rafId = 0

      const flush = () => {
        rafId = 0
        if (!pendingContent && !pendingThinking) return
        const c = pendingContent
        const t = pendingThinking
        pendingContent = ''
        pendingThinking = ''
        setMsgs((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = {
              ...last,
              content: last.content + c,
              thinking: t ? (last.thinking ?? '') + t : last.thinking,
            }
          }
          return next
        })
      }

      try {
        for await (const chunk of streamChat(host, selectedModel, withSys, controller.signal, useThink)) {
          pendingContent += chunk.content ?? ''
          if (chunk.thinking) pendingThinking += chunk.thinking
          if (!rafId) rafId = requestAnimationFrame(flush)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMsgs((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              content: `Error: ${(err as Error).message}`,
            }
            return next
          })
        }
      } finally {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
        flush()
        setIsStreaming(false)
        setMsgs((prev) => {
          saveHistory(prev)
          return prev
        })
      }
    },
    [host, selectedModel, saveHistory, thinkingEnabled, thinkingSupported]
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const clearHistory = useCallback(() => {
    cancel()
    setMsgs([])
    localStorage.removeItem(HISTORY_KEY)
  }, [cancel])

  const loadMessages = useCallback((msgs: Message[]) => {
    cancel()
    setMsgs(msgs)
  }, [cancel])

  return {
    models,
    selectedModel,
    selectModel,
    visionSupported,
    thinkingSupported,
    thinkingEnabled,
    toggleThinking,
    messages,
    isStreaming,
    error,
    connected,
    send,
    cancel,
    clearHistory,
    loadMessages,
  }
}
