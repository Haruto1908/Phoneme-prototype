/** Client for /api/attempts (see api/_lib/attempts.ts): record a scored attempt, get the stars back. */
import { ApiError } from './auth'
import type { Comparison } from './pronounce/dsp'

export interface AttemptVerdict {
  phase: 'baseline' | 'tracked'
  baseline: number | null
  stars: 1 | 2 | 3
  cheerKey: 'cheer1' | 'cheer2' | 'cheer3'
  improvement: number | null
  attempts: number
}

export interface SoundProgress {
  attempts: number
  baseline: number | null
  best: number
  last: number
  lastAt: string
}

export const ATTEMPTS_CSV_URL = '/api/attempts/csv'

async function call<T>(action: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(`/api/attempts/${action}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) throw new ApiError(r.status, typeof data.error === 'string' ? data.error : 'server')
  return data as T
}

/** The numbers worth keeping from a comparison — everything except the raw frames. */
export function measurementsOf(c: Comparison) {
  return {
    score: c.score,
    margin: c.margin,
    rank: c.rank,
    targetCost: c.cost,
    costs: c.costs,
    bestOther: c.bestOther,
    warp: c.warp,
    duration: c.user.duration,
    voiced: c.user.voiced,
    centroid: c.user.centroid,
    peakDb: c.user.peakDb,
    absScore: c.absScore,
  }
}

export const attemptsApi = {
  record: (soundId: string, c: Comparison, reasonKey: string, lang: string, mime?: string) =>
    call<AttemptVerdict>('record', 'POST', { soundId, lang, internal: measurementsOf(c), reasonKey, device: mime ? { mime } : undefined }),
  summary: () => call<{ sounds: Record<string, SoundProgress>; baselineAttempts: number }>('summary', 'GET'),
}

/**
 * Stars when the server cannot be reached (offline, dev without Mongo): same rule as api/_lib/attempts.ts with
 * no baseline, so the child still gets a reward and the lesson goes on.
 */
export function localVerdict(score: number): AttemptVerdict {
  const stars = score >= 80 ? 3 : 2
  return { phase: 'baseline', baseline: null, stars, cheerKey: `cheer${stars}` as AttemptVerdict['cheerKey'], improvement: null, attempts: 0 }
}
