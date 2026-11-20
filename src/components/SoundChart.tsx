import { useEffect, useRef, useState } from 'react'
import type { Manifest } from '../types'
import { asset } from '../lib/media'
import { cardLabel } from '../lib/plan'
import { t, type Lang } from '../lib/i18n'
import { SoundCard } from './SoundCard'
import { SectionTitle } from './controls'
import { MouthIcon } from './icons'

interface SoundChartProps {
  manifest: Manifest
  lang: Lang
  /** Id of the sound currently playing (card wiggles), if any. */
  playingId: string | null
  /** True while a Word Builder block is waiting for a sound. */
  armed: boolean
  /** Called synchronously from the tap so the player can start media inside the user gesture. */
  onPress: (id: string) => void
}

/**
 * Composition 2: the sound cards. A tap plays the sound; a drag puts it in the Word Builder.
 * On wide screens (lg) the panel is exactly as tall as the column beside it (App.tsx) and the cards scroll inside it,
 * under a fixed header; soft fades at the top and bottom show when there are more cards that way. On narrow screens
 * the cards simply flow with the page.
 */
export function SoundChart({ manifest, lang, playingId, armed, onPress }: SoundChartProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ up: false, down: false })

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => {
      const up = el.scrollTop > 4
      const down = el.scrollTop + el.clientHeight < el.scrollHeight - 4
      setMore((m) => (m.up === up && m.down === down ? m : { up, down }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [manifest.sounds.length])

  const fade = 'pointer-events-none absolute inset-x-0 z-10 hidden h-8 transition-opacity duration-200 lg:block'
  return (
    <section className="panel flex h-full flex-col gap-4 rounded-panel p-4 sm:p-5 lg:absolute lg:inset-0" aria-label={t('sounds', lang)}>
      <div className="no-select flex flex-wrap items-center gap-x-3 gap-y-1">
        <SectionTitle icon={<MouthIcon className="h-5 w-5" />} tone="mint">
          {t('sounds', lang)}
        </SectionTitle>
        <span className="rounded-full bg-sunk px-2.5 py-0.5 text-xs font-extrabold text-muted ring-1 ring-line">{manifest.sounds.length}</span>
        <p className="basis-full text-sm font-semibold text-muted sm:ml-auto sm:basis-auto">{t('tapHint', lang)}</p>
      </div>
      <div className="relative min-h-0 flex-1">
        <span aria-hidden="true" className={`${fade} top-0 rounded-t-2xl bg-gradient-to-b from-panel to-transparent ${more.up ? 'opacity-100' : 'opacity-0'}`} />
        {/* room around the grid so a card's lift, wiggle and shadow are never clipped by the scroll area */}
        <div
          ref={scroller}
          className="-mx-2 h-full px-2 pb-3 pt-1 lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-gutter:stable] lg:[scrollbar-width:thin]"
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5" role="group" aria-label={t('sounds', lang)}>
            {manifest.sounds.map((s, i) => (
              <SoundCard
                key={s.id}
                id={s.id}
                label={cardLabel(s)}
                word={s.exampleWord}
                figure={s.figure ? asset(s.figure) : null}
                color={s.color}
                playing={playingId === s.id}
                armed={armed}
                voiced={s.voiced}
                ariaLabel={`${cardLabel(s)} ${s.exampleWord}`}
                onPress={onPress}
                delayMs={i * 40}
              />
            ))}
          </div>
        </div>
        <span aria-hidden="true" className={`${fade} bottom-0 rounded-b-2xl bg-gradient-to-t from-panel to-transparent ${more.down ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    </section>
  )
}
