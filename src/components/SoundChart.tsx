import type { Manifest } from '../types'
import { asset } from '../lib/media'
import { cardLabel } from '../lib/plan'
import { t, type Lang } from '../lib/i18n'
import { SoundCard } from './SoundCard'

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

/** Composition 2: the sound cards — /th/ /th/ /r/ /k/ /æ/ /t/. A tap plays the sound; a drag puts it in the Word Builder. */
export function SoundChart({ manifest, lang, playingId, armed, onPress }: SoundChartProps) {
  return (
    <section className="panel flex h-full flex-col gap-4 rounded-panel p-4 sm:p-5" aria-label={t('sounds', lang)}>
      <div className="no-select flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="text-lg font-black tracking-tight text-ink">{t('sounds', lang)}</h2>
        <span className="rounded-full bg-sunk px-2.5 py-0.5 text-xs font-extrabold text-muted ring-1 ring-line">{manifest.sounds.length}</span>
        <p className="basis-full text-sm font-semibold text-muted sm:ml-auto sm:basis-auto">{t('tapHint', lang)}</p>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5" role="group" aria-label={t('sounds', lang)}>
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
    </section>
  )
}
