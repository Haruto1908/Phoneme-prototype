import type { TileColor } from '../types'
import { palette } from './palette'

/**
 * Stand-in for the picture cue (thumb, apple, cat …).
 * Blast's designer is producing the real icons; this keeps the slot, size and label.
 * Replace by rendering <img src={sound.cueImage}> here once the assets arrive.
 */
export function CuePlaceholder({ cue, color }: { cue: string; color: TileColor }) {
  const c = palette[color]
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl border-[3px] border-dashed bg-white/55 ${c.border}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        className={`h-9 w-9 opacity-70 ${c.ink}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="6" y="8" width="36" height="32" rx="6" />
        <circle cx="18" cy="19" r="3.5" fill="currentColor" stroke="none" />
        <path d="M8 36l10-10 7 7 6-6 9 9" />
      </svg>
      <span className={`text-[11px] font-semibold uppercase tracking-wider opacity-70 ${c.ink}`}>{cue}</span>
    </div>
  )
}
