import type { Settings } from '../hooks/useSettings'

type TeamMode = Settings['teamMode']

const MODES: { value: TeamMode; label: string; color: string }[] = [
  { value: 'red',    label: 'Red',    color: 'var(--c-danger)' },
  { value: 'blue',   label: 'Blue',   color: 'var(--c-accent)' },
  { value: 'purple', label: 'Purple', color: '#a78bfa' },
  { value: 'custom', label: 'Custom', color: 'var(--c-text-2)' },
]

interface Props {
  mode: TeamMode
  onModeChange: (mode: TeamMode) => void
}

export function TeamModeSlider({ mode, onModeChange }: Props) {
  return (
    <div className="chr-segment">
      {MODES.map((m) => {
        const isActive = mode === m.value
        return (
          <button
            key={m.value}
            data-active={isActive}
            onClick={() => onModeChange(m.value)}
            style={isActive ? { color: m.color } : {}}
            title={`${m.label} Team mode`}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
