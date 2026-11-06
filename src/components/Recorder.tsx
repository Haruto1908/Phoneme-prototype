import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Sound, TileColor } from '../types'
import { palette } from './palette'
import { t, type Lang } from '../lib/i18n'
import { asset } from '../lib/media'
import { scoreRecording, unlockAudio } from '../lib/pronounce/analyze'
import { allReferences, preloadReferences } from '../lib/pronounce/references'
import { reasonKey, reasonText, SOUND_META, type ReasonKey } from '../lib/pronounce/reasons'
import { attemptsApi, localVerdict, type AttemptVerdict } from '../lib/attempts'
import { CompareIcon, MicIcon, ReplayIcon, StarIcon, StopIcon } from './icons'

/** Longest recording we keep; a single sound is well under this. */
const MAX_REC_MS = 3000
const MIN_REC_MS = 250

/** Confetti pieces for a three-star result: direction, spin and tone per piece. */
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2
  const r = 70 + (i % 3) * 22
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r - 30, spin: 200 + (i % 5) * 90, delay: (i % 4) * 40, tone: ['bg-coral-ink', 'bg-sun-ink', 'bg-mint-ink', 'bg-sky-ink', 'bg-lavender-ink'][i % 5] }
})

export interface RecorderTarget {
  id: string
  label: string
  color: TileColor
  /** Model's audio for this sound and the slice of it that carries the sound. */
  audio: string
  audioWindow: [number, number] | null
}

interface RecorderProps {
  lang: Lang
  host: string
  target: RecorderTarget
  /** every sound in the manifest — the attempt is scored against all of them (contrast score) */
  sounds: Sound[]
  muted: boolean
  volume: number
}

type Stage = 'idle' | 'recording' | 'analysing' | 'result'
type ErrorKey = 'micDenied' | 'micUnsupported' | 'tooShort' | 'err.server'

interface Result {
  verdict: AttemptVerdict
  reason: ReasonKey
  url: string
  blob: Blob
}

/** Speak a line in the lesson language; silently does nothing where speech synthesis is unavailable. */
function say(text: string, lang: Lang, volume: number): void {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang === 'jp' ? 'ja-JP' : 'en-US'
  u.rate = 0.95
  u.pitch = 1.1
  u.volume = volume
  const voice = synth.getVoices().find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang === 'jp' ? 'ja' : 'en'))
  if (voice) u.voice = voice
  synth.speak(u)
}

/**
 * Right half of the practice pop-up: tap the microphone, say the sound, get stars and one line of advice (spoken
 * too), then hear your attempt and the model's back to back. The attempt is scored in the browser against every
 * sound (lib/pronounce) and the measurements go to /api/attempts, which keeps the child's hidden baseline and
 * decides the stars. No number is ever shown — four-year-olds read stars, not scores.
 */
export function Recorder({ lang, host, target, sounds, muted, volume }: RecorderProps) {
  const c = palette[target.color]
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<ErrorKey | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [level, setLevel] = useState(0)
  const [playing, setPlaying] = useState<'you' | 'host' | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const stopTimer = useRef<number | null>(null)
  const meterRaf = useRef<number | null>(null)
  const meterCtx = useRef<AudioContext | null>(null)
  const playersRef = useRef<HTMLAudioElement[]>([])

  const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  function releaseMic() {
    if (stopTimer.current !== null) {
      clearTimeout(stopTimer.current)
      stopTimer.current = null
    }
    if (meterRaf.current !== null) {
      cancelAnimationFrame(meterRaf.current)
      meterRaf.current = null
    }
    meterCtx.current?.close().catch(() => {})
    meterCtx.current = null
    streamRef.current?.getTracks().forEach((tr) => tr.stop())
    streamRef.current = null
    recRef.current = null
    setLevel(0)
  }

  function stopPlayback() {
    playersRef.current.forEach((a) => {
      a.pause()
      a.onended = null
      a.ontimeupdate = null
    })
    playersRef.current = []
    setPlaying(null)
  }

  // warm the reference cache so the first score does not wait for twelve decodes; tidy up on target change / unmount
  const resultUrl = useRef<string | null>(null)
  useEffect(() => {
    preloadReferences(sounds)
    return () => {
      releaseMic()
      stopPlayback()
      window.speechSynthesis?.cancel()
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
      resultUrl.current = null
    }
  }, [target.id, sounds])

  async function startRecording() {
    setError(null)
    if (!supported) {
      setError('micUnsupported')
      return
    }
    unlockAudio()
    stopPlayback()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      streamRef.current = stream
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m))
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const ms = performance.now() - startedAt.current
        releaseMic()
        if (ms < MIN_REC_MS || blob.size < 1000) {
          setError('tooShort')
          setStage('idle')
          return
        }
        void analyse(blob)
      }
      recRef.current = rec
      startedAt.current = performance.now()
      rec.start()
      setStage('recording')
      startMeter(stream)
      stopTimer.current = window.setTimeout(stopRecording, MAX_REC_MS)
    } catch (e) {
      releaseMic()
      setError(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'micDenied' : 'micUnsupported')
      setStage('idle')
    }
  }

  function stopRecording() {
    const rec = recRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  /** Live input level for the ring around the button. */
  function startMeter(stream: MediaStream) {
    try {
      const ctx = new AudioContext()
      meterCtx.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      const buf = new Uint8Array(an.fftSize)
      const tick = () => {
        an.getByteTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          s += v * v
        }
        setLevel(Math.min(1, Math.sqrt(s / buf.length) * 4))
        meterRaf.current = requestAnimationFrame(tick)
      }
      tick()
    } catch {
      /* meter is cosmetic */
    }
  }

  async function analyse(blob: Blob) {
    setStage('analysing')
    try {
      const refs = await allReferences(sounds)
      const cmp = await scoreRecording(blob, target.id, refs)
      const meta = SOUND_META[target.id] ?? { id: target.id, voiced: false, held: true }
      const reason = reasonKey(cmp, meta)
      // the server owns the baseline and the stars; offline we fall back to the same rule without a baseline
      const verdict = await attemptsApi.record(target.id, cmp, reason, lang, blob.type).catch(() => localVerdict(cmp.score))
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current)
      const url = URL.createObjectURL(blob)
      resultUrl.current = url
      setResult({ verdict, reason, url, blob })
      setStage('result')
      if (!muted) say(`${t(verdict.cheerKey, lang)} ${reasonText(reason, lang, host)}`, lang, volume)
    } catch {
      setError('err.server')
      setStage('idle')
    }
  }

  /** Your attempt, then the model's clip (its sound window only). */
  function compare() {
    if (!result) return
    stopPlayback()
    const you = new Audio(result.url)
    const model = new Audio(asset(target.audio))
    for (const a of [you, model]) {
      a.muted = muted
      a.volume = volume
    }
    playersRef.current = [you, model]
    const [ws, we] = target.audioWindow ?? [0, Number.POSITIVE_INFINITY]
    const playModel = () => {
      setPlaying('host')
      model.currentTime = ws
      model.ontimeupdate = () => {
        if (model.currentTime >= we) {
          model.pause()
          model.ontimeupdate = null
          setPlaying(null)
        }
      }
      model.onended = () => setPlaying(null)
      model.play().catch(() => setPlaying(null))
    }
    setPlaying('you')
    you.onended = () => window.setTimeout(playModel, 250)
    you.play().catch(playModel)
  }

  function reset() {
    stopPlayback()
    window.speechSynthesis?.cancel()
    setError(null)
    setStage('idle')
  }

  const got = result?.verdict.stars ?? 0

  return (
    <section className="no-select flex h-full flex-col items-center gap-3 panel rounded-[24px] p-4 text-center" aria-label={t('yourTurn', lang)}>
      <h3 className="text-lg font-black tracking-tight text-ink">{t('yourTurn', lang)}</h3>

      {stage !== 'result' && (
        <>
          <p className="min-h-10 text-sm font-medium text-muted">
            {error ? t(error, lang) : stage === 'recording' ? t('recording', lang) : stage === 'analysing' ? t('analysing', lang) : t('recHint', lang)}
          </p>
          <button
            type="button"
            aria-label={stage === 'recording' ? t('recording', lang) : t('record', lang)}
            aria-pressed={stage === 'recording'}
            disabled={stage === 'analysing'}
            onClick={stage === 'recording' ? stopRecording : startRecording}
            className={`relative mt-2 flex h-32 w-32 items-center justify-center rounded-full shadow-[0_8px_0_0_rgba(0,0,0,0.18),0_18px_30px_-12px_rgba(0,0,0,0.45)] transition-[transform,background-color] hover:-translate-y-0.5 active:translate-y-[3px] disabled:opacity-50 ${stage === 'recording' ? 'bg-accent text-on-accent' : 'bg-ink text-canvas'}`}
          >
            {/* input-level halo while recording */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-accent/30 transition-transform duration-75"
              style={{ transform: `scale(${stage === 'recording' ? 1 + level * 0.45 : 0})` }}
            />
            {stage === 'recording' ? <StopIcon className="relative h-14 w-14" /> : <MicIcon className="relative h-16 w-16" />}
          </button>
          {stage === 'analysing' && <span className="mt-2 h-2 w-24 animate-pulse rounded-full bg-ink/20" aria-hidden="true" />}
        </>
      )}

      {stage === 'result' && result && (
        <>
          {/* stars: the whole verdict, no number — the big middle star lifts on three */}
          <div className="animate-pop relative mt-3 flex h-32 items-end justify-center gap-2" role="img" aria-label={`${got} / 3`}>
            {got === 3 && (
              <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
                {CONFETTI.map((p, i) => (
                  <span
                    key={i}
                    className={`animate-confetti absolute -ml-1 -mt-1 h-2.5 w-2.5 rounded-sm ${p.tone}`}
                    style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--spin': `${p.spin}deg`, animationDelay: `${p.delay}ms` } as CSSProperties}
                  />
                ))}
              </span>
            )}
            {[0, 1, 2].map((i) => {
              const lit = i < got
              const size = i === 1 ? 'h-24 w-24' : 'h-16 w-16 mb-3'
              return (
                <StarIcon
                  key={i}
                  filled={lit}
                  className={`${size} ${lit ? 'animate-star text-sun-ink drop-shadow-[0_3px_0_rgba(0,0,0,0.14)]' : 'text-ink/15'}`}
                  style={{ animationDelay: `${150 + i * 160}ms` }}
                />
              )
            })}
          </div>
          <p className={`text-2xl font-black tracking-tight ${c.ink}`}>{t(result.verdict.cheerKey, lang)}</p>
          <p className="max-w-xs text-sm font-semibold leading-snug text-ink/80">{reasonText(result.reason, lang, host)}</p>

          <div className="mt-auto flex w-full flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={compare}
              className={`flex h-14 w-full max-w-xs items-center justify-center gap-3 rounded-full bg-panel-strong px-5 text-lg font-extrabold shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[3px] active:shadow-none ${c.ink}`}
            >
              <CompareIcon className="h-7 w-7" />
              {playing === 'you' ? `${t('you', lang)}…` : playing === 'host' ? `${host}…` : t('compare', lang)}
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-extrabold text-ink/70 transition-colors hover:text-ink"
            >
              <ReplayIcon className="h-6 w-6" />
              {t('recordAgain', lang)}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
