import type { DragEvent } from 'react'
import type { TileColor } from '../types'
import { palette } from './palette'
import { BuzzBadge } from './icons'
import { CARD_DRAG_TYPE, cardDrag } from '../lib/drag'

interface SoundCardProps {
  id: string
  /** The simple pronunciation, e.g. "/th/". */
  label: string
  /** Cue word under the label ("three", "feather"), which also tells the two th cards apart. */
  word: string
  /** Cute picture for the cue (3, feather, rabbit, cat, apple, 10). */
  figure: string | null
  color: TileColor
  playing: boolean
  /** True while a Word Builder block is waiting for a sound: the card shows it will be added, not played. */
  armed: boolean
  voiced?: boolean
  ariaLabel: string
  onPress: (id: string) => void
  /** Staggers the entrance animation. */
  delayMs?: number
}

/**
 * One sound card. Sized for a small finger on an iPad: the whole card is the button; it can also be dragged into
 * the Word Builder. Colour classes come from palette.ts so Tailwind can see them spelled out.
 */
export function SoundCard({ id, label, word, figure, color, playing, armed, voiced, ariaLabel, onPress, delayMs = 0 }: SoundCardProps) {
  const c = palette[color]
  const onDragStart = (e: DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData(CARD_DRAG_TYPE, id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'copy'
    cardDrag.id = id
    // drag the picture sticker rather than the whole card
    const sticker = e.currentTarget.querySelector<HTMLElement>('[data-sticker]')
    if (sticker) e.dataTransfer.setDragImage(sticker, sticker.offsetWidth / 2, sticker.offsetHeight / 2)
  }
  const onDragEnd = () => {
    cardDrag.id = null
  }
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={ariaLabel}
      aria-pressed={playing}
      onClick={() => onPress(id)}
      className={[
        'no-select group animate-rise relative flex min-h-[190px] flex-col items-center justify-center gap-3 overflow-hidden rounded-tile p-4 sm:min-h-[220px] sm:p-5',
        'ring-1 ring-white/60 dark:ring-white/10',
        'transition-[transform,box-shadow] duration-200 ease-out',
        'hover:-translate-y-1 active:translate-y-[4px] active:scale-[0.985]',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-ink/40',
        'shadow-tile active:shadow-tile-pressed',
        c.bg,
        playing ? 'animate-wiggle' : '',
        armed ? 'ring-4 ring-ink/30 ring-offset-2' : '',
      ].join(' ')}
      style={{ ['--edge' as string]: c.edgeVar, animationDelay: playing ? undefined : `${delayMs}ms` }}
    >
      {/* soft highlight so the tile reads as a physical card */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.55),transparent_55%)] dark:bg-[radial-gradient(120%_80%_at_20%_0%,rgba(255,255,255,0.08),transparent_55%)]" aria-hidden="true" />

      {/* picture cue on top: a white sticker so the figure pops on the coloured card */}
      <span
        data-sticker
        className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-[0_4px_0_0_var(--edge),0_10px_20px_-10px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-[1.04] group-active:scale-95 sm:h-28 sm:w-28"
        aria-hidden="true"
      >
        {figure ? (
          <img src={figure} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${c.ink}`}>{word}</span>
        )}
      </span>
      {/* pronunciation under the picture, with the cue word in small type */}
      <span className={`relative flex min-w-0 flex-col items-center gap-1 ${c.ink}`}>
        <span className="flex items-center gap-2">
          <span className="font-ipa text-4xl font-bold leading-none sm:text-5xl">{label}</span>
          {voiced && <BuzzBadge className="h-6 w-6 opacity-80" />}
        </span>
        <span className="text-xs font-extrabold uppercase tracking-[0.18em] opacity-70">{word}</span>
      </span>
      {armed && (
        <span className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xl font-black shadow-raise ${c.ink}`} aria-hidden="true">
          +
        </span>
      )}
      <SoundBars active={playing} className={`absolute left-4 top-3 ${c.ink}`} />
    </button>
  )
}

function SoundBars({ active, className }: { active: boolean; className?: string }) {
  return (
    <div className={`flex h-6 items-end gap-[3px] transition-opacity ${active ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`block w-[5px] rounded-full bg-current ${active ? 'animate-bars' : ''}`}
          style={{ height: `${[14, 22, 18, 10][i]}px`, animationDelay: `${i * 0.12}s`, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  )
}
