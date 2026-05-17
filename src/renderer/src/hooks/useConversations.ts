import { useState, useCallback, useEffect } from 'react'
import type { Message } from '../lib/ollama'

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

const STORE_KEY = 'chronos:conversations'
const MAX_CONVERSATIONS = 50

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(convs: Conversation[]) {
  const stripped = convs.map((c) => ({
    ...c,
    messages: c.messages.map((m) => ({ ...m, image: undefined })),
  }))
  localStorage.setItem(STORE_KEY, JSON.stringify(stripped))
}

function titleFromMessages(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New conversation'
  const text = first.content.trim()
  return text.length > 42 ? text.slice(0, 42) + '…' : text
}

function makeId() {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(load)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    save(conversations)
  }, [conversations])

  const saveConversation = useCallback((messages: Message[]) => {
    if (messages.length === 0) return

    setConversations((prev) => {
      const existing = activeId ? prev.find((c) => c.id === activeId) : null
      const updated: Conversation = {
        id: existing?.id ?? makeId(),
        title: titleFromMessages(messages),
        messages,
        updatedAt: Date.now(),
      }

      const rest = prev.filter((c) => c.id !== updated.id)
      const next = [updated, ...rest].slice(0, MAX_CONVERSATIONS)
      return next
    })
  }, [activeId])

  const switchConversation = useCallback((id: string): Message[] => {
    const conv = conversations.find((c) => c.id === id)
    if (!conv) return []
    setActiveId(id)
    return conv.messages
  }, [conversations])

  const newConversation = useCallback(() => {
    setActiveId(null)
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveId((prev) => (prev === id ? null : prev))
  }, [])

  return {
    conversations,
    activeId,
    saveConversation,
    switchConversation,
    newConversation,
    deleteConversation,
  }
}
