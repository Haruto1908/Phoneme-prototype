import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react'
import { palette } from './palette'
import { asset, mediaUrl } from '../lib/media'
import { t, type Lang } from '../lib/i18n'
import { clipWindow, type PlayItem } from '../lib/plan'
import { createThSideview, PORTRAIT_GIRL, type ThSideview, type ThSound } from '../animations/th-sideview.js'
import { CloseIcon, MouthIcon, PlayIcon, ReplayIcon, TongueIcon } from './icons'

export interface PlayerHandle {
  /** Must be called from the tap handler itself: iOS only lets media start with sound inside a user gesture. */
  start(items: PlayItem[]): void
  stop(): void
}

type Phase = 'idle' | 'mouth' | 'tongue' | 'done'

/**
 * Framing of the side view (image px): nose to chin around the cutaway, filling the stage. With "slice" a wide
 * stage crops only top/bottom cheek, a tall one only the back of the face — never the mouth.
 */
const PORTRAIT = { ...PORTRAIT_GIRL, src: asset('assets/girl_profile.jpg'), view: [430, 428, 434, 340] }

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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<ThSideview | null>(null)
  const itemsRef = useRef<PlayItem[]>([])
  const indexRef = useRef(0)
  const clipRef = useRef(0)
  /** When a clip is capped (Word Builder), where it should stop, and the timer that stops it. */
  const clipEndRef = useRef<number | null>(null)
  const clipTimerRef = useRef<number | null>(null)
  const clipDoneRef = useRef(false)
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
    const box = stageRef.current
    if (!item?.tongue || !box) return
    animRef.current?.destroy()
    const audio: Partial<Record<ThSound, string>> = {}
    audio[item.tongue.sound] = mediaUrl(item.tongue.audio)
    const anim = createThSideview(box, {
      sound: item.tongue.sound,
      audio,
      audioElement: tongueAudio(),
      portrait: PORTRAIT,
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
    if (clipRef.current + 1 < item.clips.length) playClip(clipRef.current + 1)
    else if (item.tongue) startTongue()
    else nextItem()
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
        <span className={`font-ipa font-bold leading-none ${compact ? 'text-4xl' : 'text-6xl'} ${c.ink}`}>
          {item ? item.label : <span className="text-2xl font-sans text-ink">{t('watch', lang)}</span>}
        </span>
        {items.length > 1 && (
          <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-muted">
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

      <div className="relative aspect-video w-full overflow-hidden rounded-[24px] bg-white shadow-[0_10px_30px_-12px_rgba(43,53,69,0.35)]">
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
        <div
          ref={stageRef}
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 [&>svg]:h-full [&>svg]:w-full ${showTongue ? 'opacity-100' : 'opacity-0'}`}
        />
        {phase === 'idle' && idle && <div className="absolute inset-0">{idle}</div>}
        {who && !showTongue && phase !== 'idle' && (
          <span className={`no-select absolute left-3 top-3 rounded-full bg-white/85 px-3 py-1 text-sm font-extrabold shadow ${c.ink}`}>
            {who === 'human' ? t('human', lang) : t('avatar', lang)}
          </span>
        )}
        {needsTap && (
          <button
            type="button"
            aria-label={t('tapToPlay', lang)}
            onClick={() => videoRef.current?.play().then(() => setNeedsTap(false), () => {})}
            className={`absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/90 shadow-lg ${c.ink}`}
          >
            <PlayIcon className="ml-1 h-12 w-12" />
          </button>
        )}
      </div>

      <div className="no-select flex min-h-14 items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium text-muted">{item?.hint ?? ''}</p>
        {phase === 'done' && item && (
          <div className="flex items-center gap-3">
            <BigButton label={t('again', lang)} onClick={() => start(items)} className={c.ink} compact={compact}>
              <ReplayIcon className={compact ? 'h-7 w-7' : 'h-10 w-10'} />
            </BigButton>
            {tongueAgain && (
              <BigButton label={t('tongueAgain', lang)} onClick={startTongue} className={c.ink} compact={compact}>
                <TongueIcon className={compact ? 'h-7 w-7' : 'h-10 w-10'} />
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
  const mouthOn = phase === 'mouth' || (phase === 'done' && !showTongue)
  const tongueOn = phase === 'tongue' || (phase === 'done' && showTongue)
  const size = compact ? 'h-9 w-12' : 'h-12 w-16'
  const pill = (on: boolean, dim: boolean) =>
    `flex ${size} items-center justify-center rounded-full transition-all ${on ? 'bg-white shadow-md scale-105' : 'bg-white/40'} ${dim ? 'opacity-30' : ''}`
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
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-[0_6px_0_0_rgba(43,53,69,0.12)] transition-transform active:translate-y-[3px] ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

function BigButton({ label, onClick, className, compact, children }: { label: string; onClick: () => void; className?: string; compact: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`animate-pop flex items-center justify-center rounded-full bg-white shadow-[0_6px_0_0_rgba(43,53,69,0.14),0_14px_24px_-12px_rgba(43,53,69,0.35)] transition-transform active:translate-y-[4px] ${compact ? 'h-14 w-14' : 'h-20 w-20'} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
