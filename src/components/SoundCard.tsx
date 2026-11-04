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
}

/**
 * One sound card. Sized for a small finger on an iPad: the whole card is the button; it can also be dragged into
 * the Word Builder. Colour classes come from palette.ts so Tailwind can see them spelled out.
 */
export function SoundCard({ id, label, word, figure, color, playing, armed, voiced, ariaLabel, onPress }: SoundCardProps) {
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
        'no-select group relative flex min-h-[190px] flex-col items-center justify-center gap-3 rounded-tile p-4 sm:min-h-[220px] sm:p-5',
        'transition-transform duration-150 ease-out',
        'active:translate-y-[4px] active:scale-[0.985]',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-ink/40',
        'shadow-[0_8px_0_0_var(--edge),0_14px_28px_-12px_rgba(43,53,69,0.35)]',
        'active:shadow-[0_3px_0_0_var(--edge),0_6px_14px_-10px_rgba(43,53,69,0.35)]',
        c.bg,
        playing ? 'animate-wiggle ring-4 ring-white/80' : '',
        armed ? 'ring-4 ring-ink/30 ring-offset-2' : '',
      ].join(' ')}
      style={{ ['--edge' as string]: c.edgeVar }}
    >
      {/* picture cue on top: a white sticker so the figure pops on the coloured card */}
      <span data-sticker className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white shadow-[0_4px_0_0_var(--edge)] transition-transform group-active:scale-95 sm:h-28 sm:w-28" aria-hidden="true">
        {figure ? (
          <img src={figure} alt="" draggable={false} className="h-full w-full object-cover" />
        ) : (
          <span className={`text-xs font-bold uppercase tracking-wider opacity-60 ${c.ink}`}>{word}</span>
        )}
      </span>
      {/* pronunciation under the picture, with the cue word in small type */}
      <span className={`flex min-w-0 flex-col items-center gap-0.5 ${c.ink}`}>
        <span className="flex items-center gap-2">
          <span className="font-ipa text-4xl font-bold leading-none sm:text-5xl">{label}</span>
          {voiced && <BuzzBadge className="h-6 w-6 opacity-80" />}
        </span>
        <span className="text-sm font-semibold opacity-60">{word}</span>
      </span>
      {armed && (
        <span className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xl font-black ${c.ink}`} aria-hidden="true">
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
