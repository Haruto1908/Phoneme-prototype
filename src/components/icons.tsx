/** Simple stroke icons (currentColor) used across the UI. */

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 3.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

interface IconProps {
  className?: string
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} fill="currentColor" aria-hidden="true">
      <path d="M11 6.5v19a1.5 1.5 0 002.3 1.3l14.5-9.5a1.5 1.5 0 000-2.6L13.3 5.2A1.5 1.5 0 0011 6.5z" />
    </svg>
  )
}
export function ReplayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} {...stroke} aria-hidden="true">
      <path d="M7 16a9 9 0 109-9H11" />
      <path d="M14 3l-4 4 4 4" />
    </svg>
  )
}
export function CloseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} aria-hidden="true">
      <path d="M9 9l14 14M23 9L9 23" />
    </svg>
  )
}
export function MouthIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="M4 16c4-5 8-6.5 12-4 4-2.5 8-1 12 4-4 5.5-8 7-12 7s-8-1.5-12-7z" />
      <path d="M4 16h24" />
    </svg>
  )
}
/** Side-view head with the tongue: the "inside the mouth" view. */
export function TongueIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="M9 27v-5c-3-2-4.5-5.5-4-9.5C5.8 7 10 4 15.5 4 21 4 24.5 7.5 25 12l2.5 4.5-2.5 1V21c0 1.6-1.2 2.5-2.8 2.5H19V27" />
      <path d="M12.5 17.5c2.5-2 6.5-2.3 9.5-.5" />
    </svg>
  )
}
/** Speaker; `level` 0 = muted (with a cross), 1 = one wave, 2 = two waves. */
export function SpeakerIcon({ className, level }: IconProps & { level: 0 | 1 | 2 }) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} aria-hidden="true">
      <path d="M5 12.5h5l7-6v19l-7-6H5z" fill="currentColor" stroke="none" />
      {level === 0 && <path d="M21 12l7 8M28 12l-7 8" />}
      {level >= 1 && <path d="M21 12.5c2 2 2 5 0 7" />}
      {level >= 2 && <path d="M24.5 9c4 4 4 10 0 14" />}
    </svg>
  )
}
export function VolumeDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} aria-hidden="true">
      <path d="M4 12.5h5l7-6v19l-7-6H4z" fill="currentColor" stroke="none" />
      <path d="M21 16h8" />
    </svg>
  )
}
export function VolumeUpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} aria-hidden="true">
      <path d="M4 12.5h5l7-6v19l-7-6H4z" fill="currentColor" stroke="none" />
      <path d="M21 16h8M25 12v8" />
    </svg>
  )
}
export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} aria-hidden="true">
      <path d="M16 8v16M8 16h16" />
    </svg>
  )
}
export function MinusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} aria-hidden="true">
      <path d="M8 16h16" />
    </svg>
  )
}
/** Small "voice on" mark: vibration waves, so the voiced th card looks different from the quiet one. */
export function BuzzBadge({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-7 w-7'} {...stroke} strokeWidth={3} aria-hidden="true">
      <path d="M8 12c3 3 3 5 0 8" />
      <path d="M14 8c5 5 5 11 0 16" />
      <path d="M20 4c8 8 8 16 0 24" />
    </svg>
  )
}
