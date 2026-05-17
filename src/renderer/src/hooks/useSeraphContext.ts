import { useState, useCallback, useRef } from 'react'
import type { SeraphChip, SeraphChipType } from '../lib/seraph'

let _chipCounter = 0
function makeChipId() { return `chip-${Date.now()}-${++_chipCounter}` }

export interface MentionState {
  open: boolean
  query: string      // text typed after "@"
  atIndex: number    // textarea caret position where "@" was typed
}

export function useSeraphContext() {
  const [chips, setChips] = useState<SeraphChip[]>([])
  const [mention, setMention] = useState<MentionState>({ open: false, query: '', atIndex: -1 })

  const addChip = useCallback((type: SeraphChipType, label: string, data: Record<string, unknown>) => {
    const chip: SeraphChip = { id: makeChipId(), type, label, data }
    setChips((prev) => {
      // Prevent exact duplicates (same Seraph record id)
      if (data.id && prev.some((c) => c.data.id === data.id && c.type === type)) return prev
      return [...prev, chip]
    })
  }, [])

  const removeChip = useCallback((id: string) => {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const clearChips = useCallback(() => setChips([]), [])

  // Call from InputBar onChange — detects an @ symbol and extracts the trailing query
  const handleTextChange = useCallback((text: string, cursorPos: number) => {
    // Find the last "@" before the cursor that isn't followed by whitespace before the cursor
    const textToCursor = text.slice(0, cursorPos)
    const atIdx = textToCursor.lastIndexOf('@')
    if (atIdx === -1) {
      setMention({ open: false, query: '', atIndex: -1 })
      return
    }
    const afterAt = textToCursor.slice(atIdx + 1)
    // If the query contains a space, the user moved past the @ mention — close
    if (afterAt.includes(' ') || afterAt.includes('\n')) {
      setMention({ open: false, query: '', atIndex: -1 })
      return
    }
    setMention({ open: true, query: afterAt, atIndex: atIdx })
  }, [])

  const closeMention = useCallback(() => {
    setMention({ open: false, query: '', atIndex: -1 })
  }, [])

  // Returns the cleaned text after a mention was selected (removes "@query" from textarea)
  const consumeMention = useCallback((text: string): string => {
    if (mention.atIndex === -1) return text
    return text.slice(0, mention.atIndex) + text.slice(mention.atIndex + 1 + mention.query.length)
  }, [mention])

  return {
    chips,
    addChip,
    removeChip,
    clearChips,
    mention,
    handleTextChange,
    closeMention,
    consumeMention,
  }
}
