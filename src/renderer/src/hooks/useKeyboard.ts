import { useEffect } from 'react'

interface Handlers {
  onClear: () => void
  onSettings: () => void
}

export function useKeyboard({ onClear, onSettings }: Handlers) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      // Don't intercept shortcuts while typing in an input/textarea.
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      const meta = e.metaKey || e.ctrlKey
      if (!meta) return

      if (e.key === 'k') {
        e.preventDefault()
        onClear()
      } else if (e.key === ',') {
        e.preventDefault()
        onSettings()
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClear, onSettings])
}
