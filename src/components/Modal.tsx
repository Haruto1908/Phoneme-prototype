import { useEffect, type ReactNode } from 'react'
import type { TileColor } from '../types'
import { palette } from './palette'

interface ModalProps {
  open: boolean
  label: string
  /** Background tint: the colour of the sound that is playing. */
  color: TileColor
  onClose: () => void
  /** Two-column content (player + recorder) needs a wider card. */
  wide?: boolean
  children: ReactNode
}

/**
 * Pop-up for the practice player and the Word Builder playback. Always mounted (hidden with `inert`) so the
 * player's <video> element exists before the tap that starts it.
 */
export function Modal({ open, label, color, onClose, wide, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const c = palette[color]
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      inert={!open}
      className={`fixed inset-0 z-30 flex items-center justify-center p-3 transition-opacity duration-200 sm:p-6 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    >
      <div className="absolute inset-0 bg-scrim backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative max-h-full w-full overflow-y-auto rounded-[32px] p-4 shadow-float ring-1 ring-white/50 transition-[transform,max-width] duration-200 sm:p-5 dark:ring-white/10 ${wide ? 'max-w-6xl' : 'max-w-3xl'} ${c.bg} ${open ? 'scale-100' : 'scale-95'}`}
      >
        {children}
      </div>
    </div>
  )
}
