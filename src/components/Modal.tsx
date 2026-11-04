import { useEffect, type ReactNode } from 'react'
import type { TileColor } from '../types'
import { palette } from './palette'

interface ModalProps {
  open: boolean
  label: string
  /** Background tint: the colour of the sound that is playing. */
  color: TileColor
  onClose: () => void
  children: ReactNode
}

/**
 * Pop-up for the practice player and the Word Builder playback. Always mounted (hidden with `inert`) so the
 * player's <video> element exists before the tap that starts it.
 */
export function Modal({ open, label, color, onClose, children }: ModalProps) {
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
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative max-h-full w-full max-w-3xl overflow-y-auto rounded-[32px] p-4 shadow-[0_30px_60px_-20px_rgba(43,53,69,0.5)] transition-transform duration-200 sm:p-5 ${c.bg} ${open ? 'scale-100' : 'scale-95'}`}
      >
        {children}
      </div>
    </div>
  )
}
