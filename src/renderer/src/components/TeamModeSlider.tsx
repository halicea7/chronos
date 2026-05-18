import { useRef } from 'react'
import type { Settings } from '../hooks/useSettings'

type TeamMode = Settings['teamMode']

const MODES: { value: TeamMode; label: string; color: string }[] = [
  { value: 'red',    label: 'Red',    color: 'var(--c-danger)' },
  { value: 'blue',   label: 'Blue',   color: '#60a5fa' },
  { value: 'purple', label: 'Purple', color: '#a78bfa' },
  { value: 'custom', label: 'Cst',    color: 'var(--c-text-3)' },
]

interface Props {
  mode: TeamMode
  onModeChange: (mode: TeamMode) => void
}

export function TeamModeSlider({ mode, onModeChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const idx = MODES.findIndex(m => m.value === mode)
  const activeColor = MODES[idx].color
  const thumbPct = (idx / 3) * 100

  function snap(e: React.MouseEvent) {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const snapped = Math.max(0, Math.min(3, Math.round(pct * 3)))
    onModeChange(MODES[snapped].value)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, userSelect: 'none', width: 112 }}>
      {/* Track area */}
      <div
        ref={trackRef}
        onClick={snap}
        style={{ position: 'relative', height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {/* Background rail */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 3,
          background: 'var(--c-surface-2)', borderRadius: 2,
        }} />

        {/* Filled rail */}
        <div style={{
          position: 'absolute', left: 0, height: 3,
          width: `${thumbPct}%`,
          background: activeColor,
          borderRadius: 2,
          transition: 'width 0.12s ease, background 0.12s ease',
        }} />

        {/* Tick marks */}
        {MODES.map((m, i) => (
          <div
            key={m.value}
            onClick={(e) => { e.stopPropagation(); onModeChange(m.value) }}
            style={{
              position: 'absolute',
              left: `${(i / 3) * 100}%`,
              transform: 'translateX(-50%)',
              width: 5, height: 5,
              borderRadius: '50%',
              background: i < idx ? activeColor : i === idx ? 'transparent' : 'var(--c-border-strong)',
              transition: 'background 0.12s',
              zIndex: 1,
            }}
          />
        ))}

        {/* Sliding thumb */}
        <div style={{
          position: 'absolute',
          left: `${thumbPct}%`,
          transform: 'translateX(-50%)',
          width: 13, height: 13,
          borderRadius: '50%',
          background: activeColor,
          border: '2px solid var(--c-bg-solid)',
          boxShadow: `0 0 6px ${activeColor}90, 0 1px 3px rgba(0,0,0,0.35)`,
          transition: 'left 0.12s ease, background 0.12s ease, box-shadow 0.12s ease',
          zIndex: 2,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Labels */}
      <div style={{ position: 'relative', height: 10 }}>
        {MODES.map((m, i) => (
          <span
            key={m.value}
            onClick={() => onModeChange(m.value)}
            style={{
              position: 'absolute',
              ...(i === 0 ? { left: 0 } : i === 3 ? { right: 0 } : { left: `${(i / 3) * 100}%`, transform: 'translateX(-50%)' }),
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              fontWeight: idx === i ? 600 : 400,
              color: idx === i ? m.color : 'var(--c-text-3)',
              cursor: 'pointer',
              transition: 'color 0.12s',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
            }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  )
}
