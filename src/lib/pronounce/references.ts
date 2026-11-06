/**
 * Model references for the contrast score: every sound in the manifest, from every model voice we have — the
 * avatar's audio clip and the human teacher's close-up (its soundtrack). Features are decoded once and cached.
 */
import type { Sound } from '../../types'
import { asset } from '../media'
import type { SoundRef } from './dsp'
import { referenceFeatures } from './analyze'

/**
 * Padding around the manifest's [on, off] speech window. The hand-marked windows already include onset and
 * release; the calibration matrix separated the sounds best with no padding (0.25 s let breath and room tail in).
 */
const PAD = 0

/** [start, end] to decode for one voice: the speech window padded, else the whole audio window, else the file. */
function windowFor(speech: [number, number] | null | undefined, fallback: [number, number] | null | undefined): [number, number] | null {
  if (speech) return [Math.max(0, speech[0] - PAD), speech[1] + PAD]
  return fallback ?? null
}

/**
 * Media + window per voice for one sound: the manifest's explicit `scoreRefs` when present, else the avatar clip
 * and the human clip over their speech windows. Voices without media are skipped.
 */
export function voicesOf(s: Sound): Array<{ url: string; window: [number, number] | null }> {
  if (s.scoreRefs) return s.scoreRefs.map((r) => ({ url: asset(r.src), window: windowFor(r.window, null) }))
  const out: Array<{ url: string; window: [number, number] | null }> = []
  if (s.audio) out.push({ url: asset(s.audio), window: windowFor(s.speech, s.audioWindow) })
  if (s.humanVideo) out.push({ url: asset(s.humanVideo), window: windowFor(s.humanSpeech, null) })
  return out
}

let cache: Promise<SoundRef[]> | null = null

/**
 * All sounds' reference features. A voice that fails to decode (e.g. a browser that cannot read the mp4
 * soundtrack) is dropped; a sound keeps at least its avatar clip. Resolved once per page.
 */
export function allReferences(sounds: Sound[]): Promise<SoundRef[]> {
  if (!cache) {
    cache = Promise.all(
      sounds
        .filter((s) => voicesOf(s).length)
        .map(async (s) => {
          const settled = await Promise.allSettled(voicesOf(s).map((v) => referenceFeatures(v.url, v.window)))
          const voices = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.frames.length ? [r.value] : []))
          return { id: s.id, voices }
        }),
    ).then((refs) => refs.filter((r) => r.voices.length))
    cache.catch(() => {
      cache = null
    })
  }
  return cache
}

/** Warm the cache in the background (e.g. when the practice pop-up opens) so the first score is quick. */
export function preloadReferences(sounds: Sound[]): void {
  allReferences(sounds).catch(() => {})
}
