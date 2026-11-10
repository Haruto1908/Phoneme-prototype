/** Simple stroke icons (currentColor) used across the UI. */
import type { CSSProperties } from 'react'

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
export function MicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} {...stroke} aria-hidden="true">
      <rect x="11.5" y="4" width="9" height="15" rx="4.5" />
      <path d="M7 15.5a9 9 0 0018 0M16 24.5V29M11 29h10" />
    </svg>
  )
}
export function StopIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} fill="currentColor" aria-hidden="true">
      <rect x="8" y="8" width="16" height="16" rx="3" />
    </svg>
  )
}
export function CompareIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-8 w-8'} {...stroke} aria-hidden="true">
      <path d="M4 16h6l3-8 4 16 3-8h8" />
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
export function SunIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <circle cx="16" cy="16" r="6" />
      <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1" />
    </svg>
  )
}
export function MoonIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="M26 19.5A11 11 0 0112.5 6 11 11 0 1026 19.5z" />
    </svg>
  )
}
export function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <circle cx="16" cy="11.5" r="5.5" />
      <path d="M6 27c1.5-5.5 5.5-8 10-8s8.5 2.5 10 8" />
    </svg>
  )
}
export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.6} aria-hidden="true">
      <rect x="4" y="7" width="24" height="18" rx="4" />
      <path d="M5 10l11 8 11-8" />
    </svg>
  )
}
export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.6} aria-hidden="true">
      <rect x="6" y="14" width="20" height="14" rx="4" />
      <path d="M10.5 14v-4a5.5 5.5 0 0111 0v4M16 20v3" />
    </svg>
  )
}
export function EyeIcon({ className, off }: IconProps & { off?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.6} aria-hidden="true">
      <path d="M3 16c3.5-6 8-9 13-9s9.5 3 13 9c-3.5 6-8 9-13 9S6.5 22 3 16z" />
      <circle cx="16" cy="16" r="4" />
      {off && <path d="M6 26L26 6" />}
    </svg>
  )
}
export function LogoutIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="M13 5H8a3 3 0 00-3 3v16a3 3 0 003 3h5M20 10l6 6-6 6M26 16H12" />
    </svg>
  )
}
export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} aria-hidden="true">
      <path d="M6 17l7 7L26 9" />
    </svg>
  )
}
/** Three building blocks (Word Builder). */
export function BlocksIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <rect x="4" y="17" width="10" height="10" rx="2" />
      <rect x="18" y="17" width="10" height="10" rx="2" />
      <rect x="11" y="5" width="10" height="10" rx="2" />
    </svg>
  )
}
export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="M16 5v15M9.5 13.5L16 20l6.5-6.5M6 23v2a2 2 0 002 2h16a2 2 0 002-2v-2" />
    </svg>
  )
}
/** Bar chart: the manager dashboard. */
export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="M5 27h22" />
      <path d="M9 27V16M16 27V6M23 27v-7" />
    </svg>
  )
}
/** Two figures: the student list. */
export function PeopleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <circle cx="12.5" cy="12" r="5" />
      <path d="M3.5 26c1.5-5 5-7.5 9-7.5s7.5 2.5 9 7.5" />
      <path d="M22 8.2a5 5 0 010 9.6M24 26c-.6-2.3-1.6-4.2-2.9-5.6" />
    </svg>
  )
}
/** Left arrow: back to the lesson. */
export function BackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} {...stroke} strokeWidth={2.8} aria-hidden="true">
      <path d="M26 16H7M14 8l-8 8 8 8" />
    </svg>
  )
}
/** Tiny five-point star for scores and rewards. */
export function StarIcon({ className, filled = true, style }: IconProps & { filled?: boolean; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 32 32" className={className ?? 'h-6 w-6'} style={style} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2.4} strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3.5l3.9 8 8.8 1.2-6.4 6.1 1.6 8.7L16 23.3l-7.9 4.2 1.6-8.7-6.4-6.1 8.8-1.2z" />
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
