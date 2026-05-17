import { useState, useEffect, useCallback } from 'react'
import type { Settings } from '../../../../preload/index'

export type { Settings }

const DEFAULTS: Settings = {
  hotkey: 'Alt+Space',
  ollamaHost: 'http://localhost:11434',
  ollamaHostExternal: '',
  ollamaMode: 'local',
  windowWidth: 420,
  windowHeight: 580,
  persistHistory: false,
  systemPrompt: '',
  appearance: 'system',
  variant: 'tactical',
  windowX: null,
  windowY: null,
  seraphHost: '',
  seraphToken: '',
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    window.api.setSetting(key, value)
  }, [])

  return { settings, update, loaded }
}
