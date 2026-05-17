import { useState, useEffect, useRef } from 'react'
import type { OllamaModel } from '../lib/ollama'
import { modelSupportsVision, modelNameSupportsThinking, formatModelSize, formatModelName } from '../lib/ollama'
import { IconChevron, IconCheck, IconSearch } from './Icons'
import type { Settings } from '../hooks/useSettings'

interface Props {
  models: OllamaModel[]
  selected: string
  visionActive: boolean
  onSelect: (name: string) => void
  mode: Settings['ollamaMode']
  externalHost: string
  onModeChange: (mode: Settings['ollamaMode']) => void
}

export function ModelPicker({ models, selected, visionActive, onSelect, mode, externalHost, onModeChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = search.trim()
    ? models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : models

  useEffect(() => {
    if (!open) { setSearch(''); return }
    searchRef.current?.focus()
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function pick(name: string) {
    onSelect(name)
    setOpen(false)
  }

  const label = selected ? formatModelName(selected) : 'No models'
  const externalConfigured = externalHost.trim().length > 0

  return (
    <div className="chr-model-btn-wrap" ref={wrapRef}>
      <button
        className="chr-model-btn"
        data-open={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="chr-dot-tiny" />
        {label}
        {visionActive && <span className="chr-vision">vis</span>}
        {mode === 'external' && <span className="chr-mode-badge">ext</span>}
        <IconChevron size={9} />
      </button>

      {open && (
        <div className="chr-popover">
          {/* Local / External toggle */}
          <div className="chr-popover-mode">
            <button
              data-active={mode === 'local'}
              onClick={() => onModeChange('local')}
            >
              Local
            </button>
            <button
              data-active={mode === 'external'}
              onClick={() => onModeChange('external')}
            >
              External
            </button>
          </div>

          {mode === 'external' && !externalConfigured ? (
            <div className="chr-popover-unconfigured">
              No external host set — add one in Settings.
            </div>
          ) : (
            <>
              <div className="chr-popover-search">
                <IconSearch size={11} />
                <input
                  ref={searchRef}
                  placeholder="Search models…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="chr-kbd">↑↓</span>
              </div>
              {filtered.map((m) => (
                <button
                  key={m.name}
                  className="chr-model-item"
                  data-selected={m.name === selected}
                  onClick={() => pick(m.name)}
                >
                  {formatModelName(m.name)}
                  <span className="chr-model-meta">
                    {modelSupportsVision(m) && <span className="chr-cap-badge chr-cap-vis">vis</span>}
                    {modelNameSupportsThinking(m.name) && <span className="chr-cap-badge chr-cap-think">think</span>}
                    {m.size && <span>{formatModelSize(m.size)}</span>}
                    {m.name === selected && (
                      <span className="chr-check"><IconCheck size={11} /></span>
                    )}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '8px', fontSize: 11, color: 'var(--c-text-3)', textAlign: 'center' }}>
                  No results
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
