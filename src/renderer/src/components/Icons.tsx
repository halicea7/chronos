import React from 'react'

export function ChronosMark({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M 12 12 L 12 5" />
      <path d="M 12 12 L 17 14" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconSend({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 12 19 L 12 5" />
      <path d="M 6 11 L 12 5 L 18 11" />
    </svg>
  )
}

export function IconStop({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  )
}

export function IconScreenshot({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 4 8 L 4 6 a 2 2 0 0 1 2 -2 L 8 4" />
      <path d="M 16 4 L 18 4 a 2 2 0 0 1 2 2 L 20 8" />
      <path d="M 4 16 L 4 18 a 2 2 0 0 0 2 2 L 8 20" />
      <path d="M 16 20 L 18 20 a 2 2 0 0 0 2 -2 L 20 16" />
      <rect x="8" y="9" width="8" height="6" rx="1" />
    </svg>
  )
}

export function IconSettings({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="19" y2="17" />
      <circle cx="10" cy="7" r="2.2" fill="var(--c-bg-solid)" />
      <circle cx="15" cy="12" r="2.2" fill="var(--c-bg-solid)" />
      <circle cx="8"  cy="17" r="2.2" fill="var(--c-bg-solid)" />
    </svg>
  )
}

export function IconTrash({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 4 7 L 20 7" />
      <path d="M 9 7 L 9 4 L 15 4 L 15 7" />
      <path d="M 6 7 L 7 20 a 1 1 0 0 0 1 1 L 16 21 a 1 1 0 0 0 1 -1 L 18 7" />
    </svg>
  )
}

export function IconClose({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round">
      <path d="M 6 6 L 18 18" />
      <path d="M 18 6 L 6 18" />
    </svg>
  )
}

export function IconChevron({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="chev">
      <path d="M 6 9 L 12 15 L 18 9" />
    </svg>
  )
}

export function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 5 13 L 10 18 L 19 7" />
    </svg>
  )
}

export function IconSearch({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M 16 16 L 20 20" />
    </svg>
  )
}

export function IconLock({ size = 11 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M 8 11 L 8 8 a 4 4 0 0 1 8 0 L 16 11" />
    </svg>
  )
}

export function IconBrain({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {/* outer lobes */}
      <path d="M12 5C10 5 8 6.5 8 8.5C8 9.6 8.5 10.6 9.4 11.2C8.5 11.9 8 13 8 14.3C8 16.3 9.5 18 11.5 18H12" />
      <path d="M12 5C14 5 16 6.5 16 8.5C16 9.6 15.5 10.6 14.6 11.2C15.5 11.9 16 13 16 14.3C16 16.3 14.5 18 12.5 18H12" />
      {/* corpus callosum */}
      <line x1="12" y1="5" x2="12" y2="18" />
      {/* wrinkles */}
      <path d="M9.5 8.5Q8.5 10 9.5 11.5" />
      <path d="M14.5 8.5Q15.5 10 14.5 11.5" />
    </svg>
  )
}

export function IconConversations({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 4 5 L 4 19 L 8 16 L 20 16 L 20 5 Z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="12" x2="13" y2="12" />
    </svg>
  )
}

export function IconPlus({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round">
      <path d="M 12 5 L 12 19" />
      <path d="M 5 12 L 19 12" />
    </svg>
  )
}

export function IconCopy({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="11" height="13" rx="2" />
      <path d="M 5 16 L 5 5 a 2 2 0 0 1 2 -2 L 16 3" />
    </svg>
  )
}

export function IconWarn({ size = 13 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 12 4 L 22 20 L 2 20 Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  )
}
