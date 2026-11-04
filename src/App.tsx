import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useManifest } from './lib/useManifest'
import { asset, preloadMedia } from './lib/media'
import { t, type Lang } from './lib/i18n'
import { itemFor, type PlayItem } from './lib/plan'
import type { Presenter, TileColor } from './types'
import { TopBar } from './components/TopBar'
import { SoundChart } from './components/SoundChart'
import { WordBuilder } from './components/WordBuilder'
import { Player, type PlayerHandle } from './components/Player'
import { Modal } from './components/Modal'

const SETTINGS_KEY = 'soundchart.settings'
interface Settings {
  lang: Lang
  /** Avatar / Human / Both: whose mouth close-up plays. */
  presenter: Presenter
  muted: boolean
  volume: number
  practice: boolean
}
const DEFAULTS: Settings = { lang: 'en', presenter: 'avatar', muted: false, volume: 1, practice: true }
const PRESENTERS: Presenter[] = ['avatar', 'human', 'both']
/** Word Builder plays each sound for this long (the clips are cut to a window around the sound). */
const WORD_SECONDS = 1

/** Saved settings, overridable per session with ?lang=en|jp and ?mode=avatar|human|both. */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const s = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    const params = new URLSearchParams(window.location.search)
    const lang = params.get('lang') === 'jp' ? 'jp' : params.get('lang') === 'en' ? 'en' : s.lang
    const mode = params.get('mode') ?? s.presenter
    return {
      lang: lang === 'jp' ? 'jp' : 'en',
      presenter: PRESENTERS.includes(mode as Presenter) ? (mode as Presenter) : 'avatar',
      muted: !!s.muted,
      volume: typeof s.volume === 'number' ? Math.min(1, Math.max(0, s.volume)) : 1,
      practice: s.practice ?? true,
    }
  } catch {
    return DEFAULTS
  }
}

/**
 * Layout: top bar (avatar, title, EN/JP, sound, Practice) · below it the sound cards (2/3) and, on the right,
 * the watch panel over the Word Builder (1/3). Practice on: a card opens the pop-up player; off: it plays in
 * the panel. The Word Builder always plays its blocks in the pop-up.
 */
export default function App() {
  const state = useManifest()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [slots, setSlots] = useState<Array<string | null>>([null, null, null, null])
  const [armed, setArmed] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLabel, setModalLabel] = useState('')
  const [modalColor, setModalColor] = useState<TileColor>('mint')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const panel = useRef<PlayerHandle>(null)
  const modal = useRef<PlayerHandle>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* private mode */
    }
  }, [settings])

  useEffect(() => {
    if (state.status !== 'ready') return
    const { sounds } = state.manifest
    preloadMedia([...sounds.map((s) => s.video), ...sounds.map((s) => s.humanVideo), ...sounds.map((s) => (s.tongue ? s.audio : null))])
  }, [state])

  const closeModal = useCallback(() => {
    modal.current?.stop()
    setModalOpen(false)
  }, [])

  if (state.status === 'loading') return <Centered>Loading…</Centered>
  if (state.status === 'error') return <Centered>Could not load the sound chart ({state.message}).</Centered>

  const { manifest } = state
  const { lang, presenter, muted, volume, practice } = settings
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }))

  function openModal(items: PlayItem[], label = items.map((i) => i.label).join(' ')) {
    panel.current?.stop()
    setModalLabel(label)
    setModalColor(items[0].color)
    setModalOpen(true)
    modal.current?.start(items)
  }

  function onCardPress(id: string) {
    if (armed !== null) {
      // a block is waiting: put the sound in it, then arm the next empty block (if any)
      const next = slots.slice()
      next[armed] = id
      setSlots(next)
      const following = next.findIndex((s, i) => i > armed && !s)
      setArmed(following === -1 ? null : following)
      return
    }
    const item = itemFor(manifest, id, lang, presenter)
    if (!item) return
    if (practice) openModal([item])
    else {
      if (modalOpen) closeModal()
      panel.current?.start([item])
    }
  }

  /**
   * Word Builder: the filled blocks in order, one second per sound, close-ups only. In Both mode the avatar
   * reads the whole row first, then the human reads it.
   */
  function onBuildPlay() {
    const pass = (p: Presenter) =>
      slots.flatMap((id) => {
        const it = id ? itemFor(manifest, id, lang, p, false, WORD_SECONDS) : null
        return it ? [it] : []
      })
    const items = presenter === 'both' ? [...pass('avatar'), ...pass('human')] : pass(presenter)
    if (!items.length) return
    const word = pass(presenter === 'both' ? 'avatar' : presenter).map((i) => i.label).join(' ')
    openModal(items, word)
  }

  const avatar = manifest.host.portrait ? asset(manifest.host.portrait) : null
  const idle = (
    <div className="no-select flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-white to-mint-bg/60 p-4 text-center">
      {avatar && <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-md" />}
      <p className="text-sm font-semibold text-muted">{t('idlePanel', lang)}</p>
    </div>
  )

  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
      <TopBar
        hostName={manifest.host.name}
        avatar={avatar}
        lang={lang}
        onLang={(l) => set('lang', l)}
        presenter={presenter}
        onPresenter={(p) => set('presenter', p)}
        muted={muted}
        onMuted={(m) => set('muted', m)}
        practice={practice}
        onPractice={(p) => set('practice', p)}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SoundChart manifest={manifest} lang={lang} playingId={playingId} armed={armed !== null} onPress={onCardPress} />
        </div>
        <div className="flex flex-col gap-4 sm:gap-5">
          <section className="rounded-[28px] bg-white/70 p-4 shadow-[0_10px_30px_-18px_rgba(43,53,69,0.45)]" aria-label={t('watch', lang)}>
            <Player
              ref={panel}
              variant="panel"
              lang={lang}
              muted={muted}
              volume={volume}
              idle={idle}
              onPlaying={(id) => {
                if (!modalOpen) setPlayingId(id)
              }}
            />
          </section>
          <WordBuilder
            manifest={manifest}
            lang={lang}
            slots={slots}
            onSlots={setSlots}
            armed={armed}
            onArmed={setArmed}
            volume={volume}
            onVolume={(delta) => setSettings((s) => ({ ...s, volume: Math.min(1, Math.max(0, +(s.volume + delta).toFixed(2))) }))}
            onPlay={onBuildPlay}
          />
        </div>
      </div>

      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted">
        <span>
          {t('avatar', lang)}: {manifest.host.name}
          {manifest.host.humanName ? ` · ${t('human', lang)}: ${manifest.host.humanName}` : ''} · {t('footerNote', lang)}
        </span>
      </footer>

      <Modal open={modalOpen} label={modalLabel} color={modalColor} onClose={closeModal}>
        <Player ref={modal} variant="modal" lang={lang} muted={muted} volume={volume} onClose={closeModal} onPlaying={setPlayingId} />
      </Modal>
    </main>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8 text-center text-lg font-semibold text-muted">{children}</div>
}
