import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { palette } from './palette'
import { asset, mediaUrl } from '../lib/media'
import { t, type Lang } from '../lib/i18n'
import { clipWindow, type PlayItem } from '../lib/plan'
import { createThSideview, PORTRAIT_GIRL, type ThSideview, type ThSound } from '../animations/th-sideview.js'
import { createThFrontview, type ThFrontview } from '../animations/th-frontview.js'
import { CloseIcon, MouthIcon, PlayIcon, ReplayIcon, TongueIcon } from './icons'
import { SectionTitle } from './controls'

export interface PlayerHandle {
  /** Must be called from the tap handler itself: iOS only lets media start with sound inside a user gesture. */
  start(items: PlayItem[]): void
  stop(): void
}

/** `ask`: the close-up has finished and we are asking whether to show the side and front views. */
type Phase = 'idle' | 'mouth' | 'ask' | 'tongue' | 'done'

/**
 * The 16:9 stage is split into two 8:9 halves once the child says yes: the side view (left) and the front view
 * (right), driven by the same audio clock. Each view gets an 8:9 window so `slice` never crops the mouth.
 */
// side view (image px): nose to throat around the cutaway, with room in front of the lips for the air
const PORTRAIT = { ...PORTRAIT_GIRL, src: asset('assets/girl_profile.jpg'), view: [440, 405, 384, 432] }
// front view (its own units): lips, both rows of teeth and the voice arcs beside the mouth
const FRONT_VIEWBOX = '126 94 148 166'

interface PlayerProps {
  ref: Ref<PlayerHandle>
  lang: Lang
  muted: boolean
  /** 0–1; applied to the close-up video and the tongue view's audio. */
  volume: number
  /** `panel`: lives in the page (shows an idle message); `modal`: inside the pop-up (has a close button). */
  variant: 'panel' | 'modal'
  /** Shown while nothing plays (panel only). */
  idle?: ReactNode
  onClose?: () => void
  /** Reports which item is playing (null when idle/done) so the chart can highlight the card. */
  onPlaying?: (id: string | null) => void
}

/**
 * Plays a queue of items back to back: for each, the avatar mouth close-up(s), then (if the item has one) the
 * side-view tongue animation with the sound again. One <video> and one <audio> element live for the whole
 * session so that, once unlocked by the first tap, every later clip can start without another gesture.
 */
export function Player({ ref, lang, muted, volume, variant, idle, onClose, onPlaying }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const frontStageRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<ThSideview | null>(null)
  const frontRef = useRef<ThFrontview | null>(null)
  const itemsRef = useRef<PlayItem[]>([])
  const indexRef = useRef(0)
  const clipRef = useRef(0)
  /** When a clip is capped (Word Builder), where it should stop, and the timer that stops it. */
  const clipEndRef = useRef<number | null>(null)
  const clipTimerRef = useRef<number | null>(null)
  const clipDoneRef = useRef(false)
  /** When the capped clip actually started playing, so a short clip still fills its whole slot. */
  const clipStartRef = useRef<number | null>(null)
  const [items, setItems] = useState<PlayItem[]>([])
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [showTongue, setShowTongue] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  const [who, setWho] = useState<'avatar' | 'human' | null>(null)

  function tongueAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'auto'
    }
    return audioRef.current
  }

  // volume / mute follow the top-bar and Word Builder controls (iOS ignores .volume but honours .muted)
  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.muted = muted
      v.volume = volume
    }
    const a = tongueAudio()
    a.muted = muted
    a.volume = volume
  }, [muted, volume])

  function report(id: string | null) {
    if (onPlaying) onPlaying(id)
  }

  function clearClipTimer() {
    if (clipTimerRef.current !== null) {
      clearTimeout(clipTimerRef.current)
      clipTimerRef.current = null
    }
  }

  function stopMedia() {
    animRef.current?.destroy()
    animRef.current = null
    frontRef.current?.destroy()
    frontRef.current = null
    clearClipTimer()
    clipEndRef.current = null
    videoRef.current?.pause()
    audioRef.current?.pause()
    setNeedsTap(false)
  }

  function playClip(i: number) {
    const item = itemsRef.current[indexRef.current]
    const v = videoRef.current
    if (!item || !v) return
    clipRef.current = i
    clipDoneRef.current = false
    clearClipTimer()
    clipEndRef.current = null
    clipStartRef.current = null
    const clip = item.clips[i]
    setWho(clip.who)
    if (clip.poster) v.poster = asset(clip.poster)
    else v.removeAttribute('poster')
    v.src = mediaUrl(clip.video)
    if (item.seconds) {
      // short window centred on the sound: seek once the duration is known (play() itself stays inside the tap)
      v.addEventListener(
        'loadedmetadata',
        () => {
          if (itemsRef.current[indexRef.current] !== item || clipRef.current !== i) return
          const { start, end } = clipWindow(clip, item.seconds as number, v.duration)
          clipEndRef.current = end
          if (start > 0) v.currentTime = start
          armClipTimer()
        },
        { once: true },
      )
    }
    v.play().then(
      () => setNeedsTap(false),
      (e: unknown) => {
        if (e instanceof DOMException && e.name === 'NotAllowedError') setNeedsTap(true)
      },
    )
  }

  /** Stop a capped clip at its window end (a tick early so the natural `ended` cannot also fire). */
  function armClipTimer() {
    const v = videoRef.current
    const end = clipEndRef.current
    if (v && !v.paused && clipStartRef.current === null) clipStartRef.current = performance.now()
    clearClipTimer()
    if (!v || end === null || v.paused) return
    if (Number.isFinite(v.duration) && end >= v.duration - 0.1) return // the clip ends there anyway
    clipTimerRef.current = window.setTimeout(
      () => {
        clipTimerRef.current = null
        if (videoRef.current !== v || clipEndRef.current !== end) return
        v.pause()
        clipFinished()
      },
      Math.max(0, (end - v.currentTime) * 1000),
    )
  }

  function startTongue() {
    const item = itemsRef.current[indexRef.current]
    const box = stageRef.current, frontBox = frontStageRef.current
    if (!item?.tongue || !box || !frontBox) return
    animRef.current?.destroy()
    frontRef.current?.destroy()
    const audio: Partial<Record<ThSound, string>> = {}
    audio[item.tongue.sound] = mediaUrl(item.tongue.audio)
    // front view first: the side view renders its first frame (and calls onTime) while it is being created
    const front = createThFrontview(frontBox, { sound: item.tongue.sound })
    front.el.setAttribute('viewBox', FRONT_VIEWBOX)
    front.el.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    frontRef.current = front
    const anim = createThSideview(box, {
      sound: item.tongue.sound,
      audio,
      audioElement: tongueAudio(),
      portrait: PORTRAIT,
      onTime: (time) => front.render(time),   // one clock (the audio) for both views
      onEnd: () => {
        if (animRef.current === anim) nextItem()
      },
    })
    anim.el.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    animRef.current = anim
    setWho(null)
    setShowTongue(true)
    setPhase('tongue')
    anim.play()
  }

  function playItem(i: number) {
    const item = itemsRef.current[i]
    if (!item) return
    indexRef.current = i
    setIndex(i)
    setShowTongue(false)
    setPhase('mouth')
    report(item.id)
    if (item.clips.length) playClip(0)
    else if (item.tongue) startTongue()
    else nextItem()
  }

  function nextItem() {
    if (indexRef.current + 1 < itemsRef.current.length) playItem(indexRef.current + 1)
    else {
      setPhase('done')
      report(null)
    }
  }

  function clipFinished() {
    const item = itemsRef.current[indexRef.current]
    if (!item || clipDoneRef.current) return
    clipDoneRef.current = true
    clearClipTimer()
    const advance = () => {
      if (clipRef.current + 1 < item.clips.length) playClip(clipRef.current + 1)
      else if (item.tongue) askTongue()
      else nextItem()
    }
    // a capped clip owns its whole slot: a clip shorter than the slot holds its last frame for the rest
    const started = clipStartRef.current
    const hold = item.seconds && started !== null ? item.seconds * 1000 - (performance.now() - started) : 0
    if (hold <= 20) return advance()
    const clip = clipRef.current
    clipTimerRef.current = window.setTimeout(() => {
      clipTimerRef.current = null
      if (itemsRef.current[indexRef.current] === item && clipRef.current === clip) advance()
    }, hold)
  }

  /** The close-up is over: pause on its last frame and ask whether to show the side view. */
  function askTongue() {
    videoRef.current?.pause()
    setPhase('ask')
  }

  function start(list: PlayItem[]) {
    if (!list.length) return
    stopMedia()
    itemsRef.current = list
    setItems(list)
    const firstTongue = list.find((x) => x.tongue)?.tongue
    if (firstTongue && list[0].clips.length) {
      // unlock the tongue view's audio element now, inside the tap, so it can play after the video ends
      const a = tongueAudio()
      a.src = mediaUrl(firstTongue.audio)
      const wasMuted = a.muted
      a.muted = true
      a.play().then(
        () => {
          a.pause()
          a.muted = wasMuted
        },
        () => {
          a.muted = wasMuted
        },
      )
    }
    playItem(0)
  }

  function stop() {
    stopMedia()
    const v = videoRef.current
    if (v) {
      v.removeAttribute('src')
      v.removeAttribute('poster')
      v.load()
    }
    itemsRef.current = []
    setItems([])
    setIndex(0)
    setShowTongue(false)
    setWho(null)
    setPhase('idle')
    report(null)
  }

  useImperativeHandle(ref, () => ({ start, stop }))

  const item = items[index] ?? null
  const c = palette[item?.color ?? 'mint']
  const compact = variant === 'panel'
  const single = items.length === 1
  const tongueAgain = phase === 'done' && single && items[0].tongue

  return (
    <div className={`flex h-full flex-col gap-3 ${compact ? '' : 'min-h-0'}`}>
      <header className="no-select flex items-center gap-3">
        {item ? (
          <span className={`font-ipa font-bold leading-none ${compact ? 'text-4xl' : 'text-6xl'} ${c.ink}`}>{item.label}</span>
        ) : (
          <SectionTitle icon={<PlayIcon className="ml-0.5 h-5 w-5" />} tone="sky">
            {t('watch', lang)}
          </SectionTitle>
        )}
        {items.length > 1 && (
          <span className="rounded-full bg-panel-strong/80 px-3 py-1 text-sm font-bold text-muted ring-1 ring-line">
            {index + 1} / {items.length}
          </span>
        )}
        <Steps className={`ml-auto ${c.ink}`} phase={phase} showTongue={showTongue} hasTongue={!!item?.tongue} compact={compact} />
        {onClose && (
          <RoundButton label={t('close', lang)} onClick={onClose} className={c.ink}>
            <CloseIcon />
          </RoundButton>
        )}
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-[24px] bg-panel-strong shadow-float ring-1 ring-line">
        <video
          ref={videoRef}
          playsInline
          preload="auto"
          disablePictureInPicture
          onEnded={clipFinished}
          onError={clipFinished}
          onPlaying={armClipTimer}
          onSeeked={armClipTimer}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${showTongue ? 'opacity-0' : 'opacity-100'}`}
        />
        {/* side view (left) and front view (right), shown together after "Yes" */}
        <div className={`absolute inset-0 grid grid-cols-2 gap-[3px] bg-line transition-opacity duration-300 ${showTongue ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          {([
            [stageRef, 'sideView'],
            [frontStageRef, 'frontView'],
          ] as const).map(([r, label]) => (
            <div key={label} className="relative min-h-0 overflow-hidden bg-panel-strong">
              <div ref={r} className="absolute inset-0 [&>svg]:h-full [&>svg]:w-full" />
              <span className={`no-select absolute left-2 top-2 rounded-full bg-panel-strong/90 px-2.5 py-0.5 font-extrabold shadow-raise ${compact ? 'text-xs' : 'text-sm'} ${c.ink}`}>
                {t(label, lang)}
              </span>
            </div>
          ))}
        </div>
        {phase === 'idle' && idle && <div className="absolute inset-0">{idle}</div>}
        {who && !showTongue && phase !== 'idle' && (
          <span className={`no-select absolute left-3 top-3 rounded-full bg-panel-strong/90 px-3 py-1 text-sm font-extrabold shadow-raise ${c.ink}`}>
            {who === 'human' ? t('human', lang) : t('avatar', lang)}
          </span>
        )}
        {phase === 'ask' && (
          <div className="no-select absolute inset-x-0 bottom-0 flex justify-center p-3 sm:p-4" role="group" aria-label={t('askSideView', lang)}>
            <div className={`animate-pop flex w-full max-w-md flex-col items-center gap-3 rounded-[24px] bg-panel-strong/95 px-4 py-4 text-center shadow-float ring-1 ring-line backdrop-blur ${c.ink}`}>
              <p className={`font-extrabold text-ink ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>{t('askSideView', lang)}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startTongue}
                  className={`flex h-12 min-w-28 items-center justify-center gap-2 rounded-full bg-accent px-5 text-lg font-extrabold text-on-accent shadow-raise transition-[transform,background-color] hover:bg-accent-hover active:translate-y-[2px] active:shadow-none ${compact ? '' : 'h-14 text-xl'}`}
                >
                  <TongueIcon className="h-6 w-6" />
                  {t('yes', lang)}
                </button>
                <button
                  type="button"
                  onClick={nextItem}
                  className={`flex h-12 min-w-24 items-center justify-center rounded-full bg-panel-strong px-5 text-lg font-extrabold text-ink shadow-raise ring-1 ring-line transition-transform active:translate-y-[2px] active:shadow-none ${compact ? '' : 'h-14 text-xl'}`}
                >
                  {t('no', lang)}
                </button>
              </div>
            </div>
          </div>
        )}
        {needsTap && (
          <button
            type="button"
            aria-label={t('tapToPlay', lang)}
            onClick={() => videoRef.current?.play().then(() => setNeedsTap(false), () => {})}
            className={`absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-full bg-panel-strong/90 shadow-float ${c.ink}`}
          >
            <PlayIcon className="ml-1 h-12 w-12" />
          </button>
        )}
      </div>

      <div className="no-select flex min-h-14 flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 basis-40 text-sm font-medium text-muted">{item?.hint ?? ''}</p>
        {phase === 'done' && item && (
          <div className="flex items-center gap-2 sm:gap-3">
            <BigButton label={t('again', lang)} onClick={() => start(items)} className={c.ink} compact={compact}>
              <ReplayIcon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
            </BigButton>
            {tongueAgain && (
              <BigButton label={t('tongueAgain', lang)} onClick={startTongue} className={c.ink} compact={compact}>
                <TongueIcon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
              </BigButton>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Two-step indicator (mouth, then tongue) so an adult can see where the lesson is. */
function Steps({ phase, showTongue, hasTongue, compact, className }: { phase: Phase; showTongue: boolean; hasTongue: boolean; compact: boolean; className?: string }) {
  const mouthOn = phase === 'mouth' || phase === 'ask' || (phase === 'done' && !showTongue)
  const tongueOn = phase === 'tongue' || (phase === 'done' && showTongue)
  const size = compact ? 'h-9 w-12' : 'h-12 w-16'
  const pill = (on: boolean, dim: boolean) =>
    `flex ${size} items-center justify-center rounded-full transition-all ${on ? 'bg-panel-strong shadow-raise scale-105' : 'bg-panel-strong/40'} ${dim ? 'opacity-30' : ''}`
  return (
    <div className={`flex items-center gap-2 ${className ?? ''} ${phase === 'idle' ? 'opacity-0' : ''}`} aria-hidden="true">
      <span className={pill(mouthOn, false)}>
        <MouthIcon className="h-6 w-6" />
      </span>
      <span className="h-1 w-3 rounded-full bg-current opacity-30" />
      <span className={pill(tongueOn, !hasTongue)}>
        <TongueIcon className="h-6 w-6" />
      </span>
    </div>
  )
}

function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-panel-strong/90 shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[3px] active:shadow-none ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Labelled pill (icon + word): children should not have to guess what a lone icon does. */
function BigButton({ label, onClick, className, compact, children }: { label: string; onClick: () => void; className?: string; compact: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`animate-pop flex items-center justify-center gap-2 rounded-full bg-panel-strong font-extrabold shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[4px] active:shadow-none ${compact ? 'h-12 px-4 text-sm' : 'h-14 px-6 text-lg'} ${className ?? ''}`}
    >
      {children}
      <span className="text-ink">{label}</span>
    </button>
  )
}
