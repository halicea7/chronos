import { useState, useEffect, useRef, useCallback } from 'react'
import type { Settings } from '../hooks/useSettings'
import { IconClose } from './Icons'
import { pingSeraph } from '../lib/seraph'

interface Props {
  settings: Settings
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  onClose: () => void
}

// ── Hotkey recorder ───────────────────────────────────────────────────────

function formatHotkey(acc: string): string[] {
  const isMac = window.api.platform === 'darwin'
  return acc.split('+').map((part) => {
    switch (part) {
      case 'CommandOrControl': return isMac ? '⌘' : 'Ctrl'
      case 'Command':          return '⌘'
      case 'Control':          return isMac ? '⌃' : 'Ctrl'
      case 'Alt':              return isMac ? '⌥' : 'Alt'
      case 'Shift':            return '⇧'
      case 'Space':            return 'Space'
      case 'Return':           return '↵'
      case 'Backspace':        return '⌫'
      case 'Up':    return '↑'
      case 'Down':  return '↓'
      case 'Left':  return '←'
      case 'Right': return '→'
      default: return part
    }
  })
}

function keyFromEvent(e: KeyboardEvent): string | null {
  if (['Meta', 'Control', 'Alt', 'Shift', 'CapsLock', 'Dead'].includes(e.key)) return null

  // Use e.code for special keys — unambiguous, layout-independent
  const codeMap: Record<string, string> = {
    'Space':       'Space',
    'ArrowUp':     'Up',
    'ArrowDown':   'Down',
    'ArrowLeft':   'Left',
    'ArrowRight':  'Right',
    'Enter':       'Return',
    'NumpadEnter': 'Return',
    'Backspace':   'Backspace',
    'Delete':      'Delete',
    'Tab':         'Tab',
    'Home':        'Home',
    'End':         'End',
    'PageUp':      'PageUp',
    'PageDown':    'PageDown',
    'Insert':      'Insert',
    'F1':  'F1',  'F2':  'F2',  'F3':  'F3',  'F4':  'F4',
    'F5':  'F5',  'F6':  'F6',  'F7':  'F7',  'F8':  'F8',
    'F9':  'F9',  'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
  }
  if (e.code in codeMap) return codeMap[e.code]

  // Printable character keys — use e.key for layout-awareness (AZERTY etc.)
  if (e.key.length === 1 && /^[a-zA-Z0-9`\-=[\]\\;',./@#]$/.test(e.key)) {
    return e.key.toUpperCase()
  }

  return null
}

function HotkeyRecorder({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [recording, setRecording] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!recording) return

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setRecording(false)
        return
      }

      const key = keyFromEvent(e)
      if (!key) return

      const parts: string[] = []
      if (e.metaKey)  parts.push('Command')
      if (e.ctrlKey)  parts.push('Control')
      if (e.altKey)   parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      parts.push(key)

      onChange(parts.join('+'))
      setRecording(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recording, onChange])

  const chips = formatHotkey(value)

  return (
    <button
      ref={btnRef}
      className={`chr-hotkey-btn${recording ? ' chr-hotkey-recording' : ''}`}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
    >
      {recording ? (
        <span className="chr-hotkey-prompt">Press shortcut…</span>
      ) : (
        <span className="chr-hotkey-chips">
          {chips.map((chip, i) => (
            <kbd key={i} className="chr-hotkey-chip">{chip}</kbd>
          ))}
        </span>
      )}
      <span className="chr-hotkey-hint">
        {recording ? 'esc to cancel' : 'click to change'}
      </span>
    </button>
  )
}

// ── Seraph connection tester ──────────────────────────────────────────────

type ConnState = 'idle' | 'testing' | 'ok' | 'err'

function SeraphSection({
  settings,
  onUpdate,
}: {
  settings: Settings
  onUpdate: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}) {
  const [showToken, setShowToken] = useState(false)
  const [connState, setConnState] = useState<ConnState>('idle')
  const [connError, setConnError] = useState<string | null>(null)

  const test = useCallback(async () => {
    if (!settings.seraphHost || !settings.seraphToken) return
    setConnState('testing')
    setConnError(null)
    const result = await pingSeraph(settings.seraphHost.trim(), settings.seraphToken.trim())
    setConnState(result.ok ? 'ok' : 'err')
    setConnError(result.error ?? null)
    setTimeout(() => setConnState('idle'), 5000)
  }, [settings.seraphHost, settings.seraphToken])

  const connected = settings.seraphHost.trim() && settings.seraphToken.trim()

  return (
    <div className="chr-settings-section">
      <h3>Seraph Integration</h3>
      {!connected && (
        <p className="chr-hint" style={{ marginBottom: 6 }}>
          Connect to a Seraph instance to use <strong>@</strong> references in chat.
        </p>
      )}
      <label>Seraph host</label>
      <input
        type="text"
        value={settings.seraphHost}
        onChange={(e) => onUpdate('seraphHost', e.target.value)}
        placeholder="http://192.168.1.10:8000"
      />
      <label>API token</label>
      <div style={{ position: 'relative' }}>
        <input
          type={showToken ? 'text' : 'password'}
          value={settings.seraphToken}
          onChange={(e) => onUpdate('seraphToken', e.target.value)}
          placeholder="srph_..."
          style={{ width: '100%', paddingRight: 32 }}
        />
        <button
          onClick={() => setShowToken((v) => !v)}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: 'var(--chr-fg-muted)',
          }}
        >
          {showToken ? 'hide' : 'show'}
        </button>
      </div>
      {connected && (
        <button
          onClick={test}
          disabled={connState === 'testing'}
          style={{
            marginTop: 6, padding: '4px 10px', fontSize: 11,
            borderRadius: 6, border: '1px solid var(--chr-border)',
            background: 'var(--chr-bg-2)', color:
              connState === 'ok' ? '#4ade80'
              : connState === 'err' ? '#f87171'
              : 'var(--chr-fg-muted)',
            cursor: connState === 'testing' ? 'default' : 'pointer',
          }}
        >
          {connState === 'testing' ? 'Testing…'
            : connState === 'ok' ? '✓ Connected'
            : connState === 'err' ? '✗ Unreachable'
            : 'Test connection'}
        </button>
      )}
      {connState === 'err' && connError && (
        <p style={{ marginTop: 4, fontSize: 10, color: '#f87171', wordBreak: 'break-all', lineHeight: 1.4 }}>
          {connError}
        </p>
      )}
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────

export function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  return (
    <div className="chr-settings-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chr-settings">
        <div className="chr-settings-head">
          <h2>Settings</h2>
          <button className="chr-iconbtn" onClick={onClose}><IconClose size={11} /></button>
        </div>

        <div className="chr-settings-body">
          <div className="chr-settings-section">
            <h3>Hotkey</h3>
            <HotkeyRecorder
              value={settings.hotkey}
              onChange={(v) => onUpdate('hotkey', v)}
            />
            <p className="chr-hint">Click to record · Escape to cancel</p>
          </div>

          <div className="chr-settings-section">
            <h3>Ollama</h3>
            <label>Local host</label>
            <input
              type="text"
              value={settings.ollamaHost}
              onChange={(e) => onUpdate('ollamaHost', e.target.value)}
              placeholder="http://localhost:11434"
            />
            <label>External host</label>
            <input
              type="text"
              value={settings.ollamaHostExternal}
              onChange={(e) => onUpdate('ollamaHostExternal', e.target.value)}
              placeholder="https://your-server:11434"
            />
          </div>

          <div className="chr-settings-section">
            <h3>Chat</h3>
            <label>System prompt</label>
            <textarea
              rows={3}
              value={settings.systemPrompt}
              onChange={(e) => onUpdate('systemPrompt', e.target.value)}
              placeholder="Optional system-level instructions…"
            />
            <label className="chr-check-row">
              <input
                type="checkbox"
                checked={settings.persistHistory}
                onChange={(e) => onUpdate('persistHistory', e.target.checked)}
              />
              <span>Persist history between sessions</span>
            </label>
          </div>

          <div className="chr-settings-section">
            <h3>Appearance</h3>
            <div className="chr-segment">
              {(['system', 'light', 'dark'] as const).map((v) => (
                <button
                  key={v}
                  data-active={settings.appearance === v}
                  onClick={() => onUpdate('appearance', v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="chr-settings-section">
            <h3>Variant</h3>
            <div className="chr-segment">
              {(['tactical', 'carbon', 'sentinel', 'vault'] as const).map((v) => (
                <button
                  key={v}
                  data-active={settings.variant === v}
                  onClick={() => onUpdate('variant', v)}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="chr-settings-section">
            <h3>Window width</h3>
            <div className="chr-slider">
              <input
                type="range"
                min={320}
                max={720}
                step={20}
                value={settings.windowWidth}
                onChange={(e) => onUpdate('windowWidth', Number(e.target.value))}
              />
              <span className="val">{settings.windowWidth}px</span>
            </div>
          </div>

          <SeraphSection settings={settings} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  )
}
