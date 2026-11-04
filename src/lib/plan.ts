import type { Manifest, Presenter, Sound, TileColor } from '../types'
import type { ThSound } from '../animations/th-sideview.js'
import { ARTICULATION_JP, type Lang } from './i18n'

export interface Clip {
  video: string
  poster: string | null
  /** Who is on screen, for the badge while it plays. */
  who: 'avatar' | 'human'
  /** [on, off] seconds of the sound inside the clip, when known. */
  speech: [number, number] | null
}

/** One thing the player shows: a sound's mouth close-up(s) and, optionally, its tongue view afterwards. */
export interface PlayItem {
  id: string
  /** Label shown while it plays, e.g. "/th/". */
  label: string
  color: TileColor
  clips: Clip[]
  tongue: { sound: ThSound; audio: string } | null
  /** Articulation hint for the adult, in the active language. */
  hint: string
  /** Play only this many seconds of each clip, centred on its speech (Word Builder: one second per sound). */
  seconds: number | null
}

/** Card label: the simple pronunciation, e.g. "/th/", "/æ/". */
export function cardLabel(s: Sound): string {
  return `/${s.card ?? s.ipa}/`
}

/**
 * Close-ups for a sound in the chosen presenter mode. Avatar first in "both", then the real mouth.
 * A mode whose clip is missing falls back to the other, so a card never plays nothing.
 */
export function clipsFor(s: Sound, presenter: Presenter): Clip[] {
  const avatar: Clip | null = s.video ? { video: s.video, poster: s.poster ?? null, who: 'avatar', speech: s.speech ?? null } : null
  const human: Clip | null = s.humanVideo
    ? { video: s.humanVideo, poster: s.humanPoster ?? null, who: 'human', speech: s.humanSpeech ?? null }
    : null
  const pick = (a: Clip | null, b: Clip | null) => (a ? [a] : b ? [b] : [])
  if (presenter === 'avatar') return pick(avatar, human)
  if (presenter === 'human') return pick(human, avatar)
  return [...(avatar ? [avatar] : []), ...(human ? [human] : [])]
}

/**
 * Build the player item for a sound. `withTongue: false` gives mouth close-ups only (the Word Builder runs the
 * clips back to back without the tongue view between them); `seconds` caps each clip to a short window.
 */
export function itemFor(manifest: Manifest, id: string, lang: Lang, presenter: Presenter, withTongue = true, seconds: number | null = null): PlayItem | null {
  const s = manifest.sounds.find((x) => x.id === id)
  if (!s) return null
  return {
    id,
    label: cardLabel(s),
    color: s.color,
    clips: clipsFor(s, presenter),
    tongue: withTongue && s.tongue && s.audio ? { sound: s.tongue.sound, audio: s.audio } : null,
    hint: lang === 'jp' ? (ARTICULATION_JP[id] ?? s.articulation) : s.articulation,
    seconds,
  }
}

/**
 * Where to start and stop a clip when only `seconds` of it should play: centred on the speech, kept inside the
 * clip. Without speech timing it plays from the start.
 */
export function clipWindow(clip: Clip, seconds: number, duration: number): { start: number; end: number } {
  const dur = Number.isFinite(duration) && duration > 0 ? duration : Infinity
  const len = Math.min(seconds, dur)
  let start = 0
  if (clip.speech) {
    const mid = (clip.speech[0] + clip.speech[1]) / 2
    start = Math.max(0, Math.min(mid - len / 2, dur - len))
  }
  return { start, end: start + len }
}
