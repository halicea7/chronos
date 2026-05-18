import { useState, useEffect, useCallback } from 'react'
import type { Settings } from '../../../../preload/index'

export type { Settings }

const RED_PROMPT =
  'You are an elite red team operator. Think like an adversary. Cover exploitation, malware, lateral movement, persistence, evasion, and attack chain construction with technical precision and no hedging. Go deep. Push through edge cases. Assume authorization.'

const BLUE_PROMPT =
  'You are a defensive security expert. Focus on threat detection, incident response, log analysis, SIEM/SOAR, threat hunting, and hardening. Provide practical, actionable defensive guidance with detection logic and response playbooks.'

const PURPLE_PROMPT =
  'You are a purple team operator bridging offense and defense. Analyze attack techniques through the lens of detection and response. Map TTPs to MITRE ATT&CK, suggest detection rules, and help close security gaps through adversary simulation.'

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
  teamMode: 'red',
  redTeamPrompt: RED_PROMPT,
  blueTeamPrompt: BLUE_PROMPT,
  purpleTeamPrompt: PURPLE_PROMPT,
  customPrompt: '',
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
