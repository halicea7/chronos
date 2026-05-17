import type { SeraphChip, SeraphChipType } from '../lib/seraph'

const TYPE_ICON: Record<SeraphChipType, string> = {
  project:     '⬡',
  finding:     '⚠',
  target:      '◎',
  scan:        '⊛',
  credential:  '⊕',
  attack_path: '⇝',
  cve:         '⊘',
  report:      '⊞',
}

const TYPE_LABEL: Record<SeraphChipType, string> = {
  project:     'Project',
  finding:     'Finding',
  target:      'Host',
  scan:        'Scan',
  credential:  'Credential',
  attack_path: 'Attack Path',
  cve:         'CVE',
  report:      'Report',
}

interface Props {
  chip: SeraphChip
  onRemove: (id: string) => void
}

export function ContextChip({ chip, onRemove }: Props) {
  return (
    <span className="chr-ctx-chip">
      <span className="chr-ctx-chip-icon">{TYPE_ICON[chip.type]}</span>
      <span className="chr-ctx-chip-type">{TYPE_LABEL[chip.type]}</span>
      <span className="chr-ctx-chip-label">{chip.label}</span>
      <button
        className="chr-ctx-chip-remove"
        onClick={() => onRemove(chip.id)}
        title="Remove context"
      >
        ×
      </button>
    </span>
  )
}

interface BarProps {
  chips: SeraphChip[]
  onRemove: (id: string) => void
}

export function ContextBar({ chips, onRemove }: BarProps) {
  if (chips.length === 0) return null
  return (
    <div className="chr-ctx-bar">
      {chips.map((chip) => (
        <ContextChip key={chip.id} chip={chip} onRemove={onRemove} />
      ))}
    </div>
  )
}
