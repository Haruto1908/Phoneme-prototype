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
import { Recorder, type RecorderTarget } from './components/Recorder'
import { SETTINGS_KEY } from './lib/settings'
import type { Theme } from './lib/theme'
import type { User } from './lib/auth'
import { usageLog, ZERO_COUNTS, type ModeCounts } from './lib/log'

interface Settings {
  /** Avatar / Human / Both: whose mouth close-up plays. */
  presenter: Presenter
  muted: boolean
  volume: number
  practice: boolean
}
const DEFAULTS: Settings = { presenter: 'avatar', muted: false, volume: 1, practice: true }
const PRESENTERS: Presenter[] = ['avatar', 'human', 'both']
/** Word Builder plays each sound for this long (the clips are cut to a window around the sound). */
const WORD_SECONDS = 2

/** Saved settings, overridable per session with ?mode=avatar|human|both. */
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const s = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    const mode = new URLSearchParams(window.location.search).get('mode') ?? s.presenter
    return {
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
 * Layout: top bar (brand, mode, language, sound, Practice, theme, account) · below it the sound cards (2/3)
 * and, on the right, the watch panel over the Word Builder (1/3). Practice on: a card opens the pop-up player;
 * off: it plays in the panel. The Word Builder always plays its blocks in the pop-up.
 */
interface AppProps {
  user: User
  lang: Lang
  onLang: (l: Lang) => void
  theme: Theme
  onTheme: (t: Theme) => void
  onLogout: () => void
  /** Managers only: open the dashboard over every student. */
  onManager?: () => void
}

export default function App({ user, lang, onLang, theme, onTheme, onLogout, onManager }: AppProps) {
  const state = useManifest()
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [slots, setSlots] = useState<Array<string | null>>([null, null, null, null])
  const [armed, setArmed] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLabel, setModalLabel] = useState('')
  const [modalColor, setModalColor] = useState<TileColor>('mint')
  /** Sound to practise with the microphone (right half of the pop-up); null for Word Builder playback. */
  const [recTarget, setRecTarget] = useState<RecorderTarget | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const panel = useRef<PlayerHandle>(null)
  const modal = useRef<PlayerHandle>(null)
  /** Per-mode usage counters for this account (shown in the account menu, exported as CSV). */
  const [usage, setUsage] = useState<ModeCounts>(ZERO_COUNTS)
  const loggedMode = useRef<Presenter | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, lang }))
    } catch {
      /* private mode */
    }
  }, [settings, lang])

  // Session log: the mode the app opened in counts as a `start`, every change after that as a `switch`.
  // The ref makes this idempotent per mode (StrictMode double-runs, re-renders), and failures stay silent:
  // logging must never get in the way of a lesson.
  useEffect(() => {
    const mode = settings.presenter
    if (loggedMode.current === mode) return
    const event = loggedMode.current === null ? 'start' : 'switch'
    loggedMode.current = mode
    usageLog.mode(mode, event, lang).then(setUsage).catch(() => {})
  }, [settings.presenter, lang])

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
  const { presenter, muted, volume, practice } = settings
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }))

  function openModal(items: PlayItem[], label = items.map((i) => i.label).join(' '), rec: RecorderTarget | null = null) {
    panel.current?.stop()
    setModalLabel(label)
    setModalColor(items[0].color)
    setRecTarget(rec)
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
    if (practice) {
      const s = manifest.sounds.find((x) => x.id === id)
      const rec: RecorderTarget | null = s?.audio ? { id, label: item.label, color: item.color, audio: s.audio, audioWindow: s.audioWindow ?? null } : null
      openModal([item], item.label, rec)
    } else {
      if (modalOpen) closeModal()
      panel.current?.start([item])
    }
  }

  /**
   * Word Builder: the filled blocks in order, two seconds per sound, close-ups only. In Both mode the avatar
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
  // Idle stage: the host "says" the hint in a speech bubble — the same voice as the rest of the lesson.
  const idle = (
    <div className="no-select flex h-full w-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_30%,var(--color-mint-bg),transparent_70%)] p-4 text-center">
      <div className="relative max-w-[16rem] rounded-[20px] bg-panel-strong px-4 py-2.5 text-sm font-extrabold text-ink shadow-raise ring-1 ring-line">
        {t('idlePanel', lang)}
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm bg-panel-strong ring-1 ring-line [clip-path:polygon(0_100%,100%_100%,100%_0)]" />
      </div>
      {avatar && <img src={avatar} alt="" className="animate-nod h-24 w-24 rounded-full object-cover shadow-raise ring-4 ring-panel-strong" />}
    </div>
  )

  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
      <TopBar
        hostName={manifest.host.name}
        avatar={avatar}
        lang={lang}
        onLang={onLang}
        theme={theme}
        onTheme={onTheme}
        presenter={presenter}
        onPresenter={(p) => set('presenter', p)}
        muted={muted}
        onMuted={(m) => set('muted', m)}
        practice={practice}
        onPractice={(p) => set('practice', p)}
        email={user.email}
        role={user.role}
        usage={usage}
        onLogout={onLogout}
        onManager={onManager}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="animate-rise lg:col-span-2 [animation-delay:60ms]">
          <SoundChart manifest={manifest} lang={lang} playingId={playingId} armed={armed !== null} onPress={onCardPress} />
        </div>
        <div className="flex flex-col gap-4 sm:gap-5">
          <section className="panel animate-rise rounded-panel p-4 [animation-delay:120ms]" aria-label={t('watch', lang)}>
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
          <div className="animate-rise [animation-delay:180ms]">
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
      </div>

      <footer className="no-select mt-auto flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-xs font-medium text-muted">
        <span>
          {t('avatar', lang)}: {manifest.host.name}
          {manifest.host.humanName ? ` · ${t('human', lang)}: ${manifest.host.humanName}` : ''}
        </span>
        <span>{t('footerNote', lang)}</span>
      </footer>

      <Modal open={modalOpen} label={modalLabel} color={modalColor} onClose={closeModal} wide={!!recTarget}>
        <div className={recTarget ? 'grid gap-4 lg:grid-cols-[3fr_2fr]' : ''}>
          <Player ref={modal} variant="modal" lang={lang} muted={muted} volume={volume} onClose={closeModal} onPlaying={setPlayingId} />
          {recTarget && modalOpen && <Recorder key={recTarget.id} lang={lang} host={manifest.host.name} target={recTarget} sounds={manifest.sounds} muted={muted} volume={volume} />}
        </div>
      </Modal>
    </main>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8 text-center text-lg font-semibold text-muted">{children}</div>
}
