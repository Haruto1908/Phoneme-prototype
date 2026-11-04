import { useState, type DragEvent, type ReactNode } from 'react'
import type { Manifest } from '../types'
import { palette } from './palette'
import { cardLabel } from '../lib/plan'
import { t, type Lang } from '../lib/i18n'
import { asset } from '../lib/media'
import { CARD_DRAG_TYPE, cardDrag } from '../lib/drag'
import { MinusIcon, PlayIcon, PlusIcon, VolumeDownIcon, VolumeUpIcon } from './icons'

export const MIN_BLOCKS = 1
export const MAX_BLOCKS = 8
export const VOLUME_STEP = 0.2

interface WordBuilderProps {
  manifest: Manifest
  lang: Lang
  /** Sound id per block, null when empty. */
  slots: Array<string | null>
  onSlots: (slots: Array<string | null>) => void
  /** Block waiting for the next card tap, if any. */
  armed: number | null
  onArmed: (i: number | null) => void
  volume: number
  /** Nudge the volume by ±VOLUME_STEP (the parent clamps to 0–1). */
  onVolume: (delta: number) => void
  /** Play the filled blocks in order (close-ups back to back, in the pop-up). Called from the tap itself. */
  onPlay: () => void
}

/**
 * Composition 4: a row of blocks the child fills with sounds (drag a card in, or tap a block and then a card),
 * with volume down / up and play at the top right.
 */
export function WordBuilder({ manifest, lang, slots, onSlots, armed, onArmed, volume, onVolume, onPlay }: WordBuilderProps) {
  const [over, setOver] = useState<number | null>(null)
  const soundById = new Map(manifest.sounds.map((s) => [s.id, s]))
  const filled = slots.filter((s): s is string => !!s)

  function setSlot(i: number, id: string | null) {
    const next = slots.slice()
    next[i] = id
    onSlots(next)
  }
  function onDrop(e: DragEvent<HTMLButtonElement>, i: number) {
    e.preventDefault()
    setOver(null)
    const id = e.dataTransfer.getData(CARD_DRAG_TYPE) || e.dataTransfer.getData('text/plain') || cardDrag.id
    if (id && soundById.has(id)) {
      setSlot(i, id)
      onArmed(null)
    }
  }
  function onDragOver(e: DragEvent<HTMLButtonElement>, i: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (over !== i) setOver(i)
  }
  function tapSlot(i: number) {
    if (slots[i]) {
      setSlot(i, null)       // tap a filled block to take the sound out again
      onArmed(null)
    } else onArmed(armed === i ? null : i)
  }
  function addBlock() {
    if (slots.length < MAX_BLOCKS) onSlots([...slots, null])
  }
  function removeBlock() {
    if (slots.length <= MIN_BLOCKS) return
    onSlots(slots.slice(0, -1))
    if (armed !== null && armed >= slots.length - 1) onArmed(null)
  }
  const level = Math.round(volume / VOLUME_STEP)
  const steps = Math.round(1 / VOLUME_STEP)

  return (
    <section className="no-select flex flex-col gap-3 rounded-[28px] bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(43,53,69,0.45)]" aria-label={t('wordBuilder', lang)}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-extrabold text-ink">{t('wordBuilder', lang)}</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <SmallButton label={t('quieter', lang)} onClick={() => onVolume(-VOLUME_STEP)} disabled={volume <= 0}>
            <VolumeDownIcon className="h-6 w-6" />
          </SmallButton>
          <div className="flex h-5 items-end gap-[3px] px-1" aria-label={`${Math.round(volume * 100)}%`} role="img">
            {Array.from({ length: steps }, (_, i) => (
              <span key={i} className={`block w-1.5 rounded-full ${i < level ? 'bg-ink' : 'bg-ink/15'}`} style={{ height: `${8 + i * 3}px` }} />
            ))}
          </div>
          <SmallButton label={t('louder', lang)} onClick={() => onVolume(VOLUME_STEP)} disabled={volume >= 1}>
            <VolumeUpIcon className="h-6 w-6" />
          </SmallButton>
          <button
            type="button"
            aria-label={t('play', lang)}
            title={filled.length ? t('play', lang) : t('wbEmpty', lang)}
            aria-disabled={!filled.length}
            onClick={() => {
              if (filled.length) onPlay()
            }}
            className={`ml-1 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_5px_0_0_rgba(43,53,69,0.18)] transition-transform active:translate-y-[2px] ${filled.length ? 'bg-coral-ink' : 'bg-ink/25'}`}
          >
            <PlayIcon className="ml-0.5 h-7 w-7" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1" role="group" aria-label={t('wordBuilder', lang)}>
          {slots.map((id, i) => {
            const s = id ? soundById.get(id) : undefined
            const c = s ? palette[s.color] : null
            const isArmed = armed === i
            // while a card hovers over this block, preview its figure
            const preview = over === i && cardDrag.id ? soundById.get(cardDrag.id) : undefined
            const shown = s ?? preview
            return (
              <button
                key={i}
                type="button"
                aria-label={s ? t('blockWith', lang, { n: i + 1, sound: cardLabel(s) }) : t('emptyBlock', lang, { n: i + 1 })}
                aria-pressed={isArmed}
                onClick={() => tapSlot(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDragLeave={() => setOver((o) => (o === i ? null : o))}
                onDrop={(e) => onDrop(e, i)}
                className={[
                  'flex h-[88px] w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl font-bold transition-all sm:h-24 sm:w-[76px]',
                  s && c ? `${c.bg} ${c.ink} shadow-[0_5px_0_0_var(--edge)]` : 'border-[3px] border-dashed border-ink/25 bg-white/60 text-ink/30',
                  isArmed ? 'scale-105 border-ink/60 ring-4 ring-ink/20' : '',
                  over === i ? 'scale-105 ring-4 ring-mint-ink/50' : '',
                ].join(' ')}
                style={c ? { ['--edge' as string]: c.edgeVar } : undefined}
              >
                {shown ? (
                  <span className={`pointer-events-none flex flex-col items-center gap-1 ${s ? '' : 'opacity-50'}`} aria-hidden={!s}>
                    {shown.figure ? (
                      <img src={asset(shown.figure)} alt="" draggable={false} className="h-10 w-10 rounded-xl bg-white object-cover sm:h-12 sm:w-12" />
                    ) : null}
                    <span className={`font-ipa text-base leading-none sm:text-lg ${s ? '' : 'text-ink/60'}`}>{cardLabel(shown)}</span>
                  </span>
                ) : (
                  <span className="pointer-events-none text-2xl font-black">{isArmed ? '?' : '+'}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-1">
          <SmallButton label={t('addBlock', lang)} onClick={addBlock} disabled={slots.length >= MAX_BLOCKS}>
            <PlusIcon className="h-5 w-5" />
          </SmallButton>
          <SmallButton label={t('removeBlock', lang)} onClick={removeBlock} disabled={slots.length <= MIN_BLOCKS}>
            <MinusIcon className="h-5 w-5" />
          </SmallButton>
        </div>
      </div>

      <p className="text-xs font-medium text-muted">{t('wbHint', lang)}</p>
    </section>
  )
}

function SmallButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-[0_4px_0_0_rgba(43,53,69,0.12)] transition-transform active:translate-y-[2px] disabled:opacity-35 disabled:active:translate-y-0"
    >
      {children}
    </button>
  )
}
