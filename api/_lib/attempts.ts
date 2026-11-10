/**
 * Pronunciation attempts: the measurements behind every try (never the audio), the hidden per-sound baseline,
 * and the stars the child was shown.
 *
 *   POST /api/attempts/record   { soundId, lang?, internal, reasonKey, device? } → { phase, baseline, stars, cheerKey, improvement, attempts }
 *   GET  /api/attempts/summary                                                 → { sounds: { [id]: progress } }
 *   GET  /api/attempts/csv                                                     → text/csv of the user's attempts
 *
 * Baseline rule (Bruce, Nov 2026): the first BASELINE_ATTEMPTS tries of a sound are scored silently; their median
 * becomes the student's private baseline. From then on the child sees progress against their own baseline, not
 * an absolute mark — so the microphone, the room and the voice cancel out, because every comparison is the
 * student against themselves. The stars rule lives here, server-side, so a manager view or an AI reads exactly
 * what the child saw.
 */
import { f3, row, safeName, sendCsv, stamp } from './csv.ts'
import { attempts, BASELINE_ATTEMPTS, progress, type AttemptDoc, type AttemptInternal, type AttemptShown, type SoundProgress } from './db.ts'
import { dispatch, HttpError, json, readJson, type Req, type Res, type Route } from './http.ts'
import { requireUser } from './session.ts'

/** Bump when the client's scoring maths changes, so old rows are not compared with new ones. */
export const ENGINE = 'contrast-v1'

/** Internal score that always earns three stars, whatever the baseline — a correct sound must be rewarded. */
const CORRECT = 80
/** Internal score that always earns two stars. */
const FAIR = 60
/** Improvement over the baseline (score points) for three / two stars. */
const BIG_GAIN = 15
const GAIN = 5

const num = (v: unknown, lo = -Infinity, hi = Infinity): number => {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n) || n < lo || n > hi) throw new HttpError(400, 'bad_measurement')
  return n
}

/** Validate and copy the client's measurements: only numbers and short ids get through. */
function readInternal(v: unknown): AttemptInternal {
  if (!v || typeof v !== 'object') throw new HttpError(400, 'bad_measurement')
  const o = v as Record<string, unknown>
  const costs: Record<string, number> = {}
  if (o.costs && typeof o.costs === 'object') {
    for (const [k, c] of Object.entries(o.costs as Record<string, unknown>).slice(0, 32)) {
      if (typeof c === 'number' && Number.isFinite(c)) costs[k.slice(0, 32)] = c
    }
  }
  return {
    score: Math.round(num(o.score, 0, 100)),
    margin: num(o.margin, -10, 10),
    rank: Math.round(num(o.rank, 1, 64)),
    targetCost: num(o.targetCost, 0, 1e3),
    costs,
    bestOther: typeof o.bestOther === 'string' ? o.bestOther.slice(0, 32) : null,
    warp: num(o.warp, 0.5, 2),
    duration: num(o.duration, 0, 60),
    voiced: num(o.voiced, 0, 1),
    centroid: num(o.centroid, 0, 2e4),
    peakDb: num(o.peakDb, -200, 10),
    absScore: Math.round(num(o.absScore, 0, 100)),
  }
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Stars + cheer for one attempt. Never zero: the lowest band is "nice try", not a failure. */
export function starsFor(score: number, baseline: number | null): Pick<AttemptShown, 'stars' | 'cheerKey'> {
  let stars: 1 | 2 | 3
  if (baseline === null) stars = score >= CORRECT ? 3 : 2 // forming the baseline: a reward for taking part
  else {
    const delta = score - baseline
    stars = delta >= BIG_GAIN || score >= CORRECT ? 3 : delta >= GAIN || score >= FAIR ? 2 : 1
  }
  return { stars, cheerKey: `cheer${stars}` }
}

async function record(req: Req, res: Res) {
  const user = await requireUser(req)
  const body = await readJson(req)
  const soundId = typeof body.soundId === 'string' ? body.soundId.slice(0, 32) : ''
  if (!soundId) throw new HttpError(400, 'bad_sound')
  const internal = readInternal(body.internal)
  const reasonKey = typeof body.reasonKey === 'string' ? body.reasonKey.slice(0, 32) : 'close'
  const lang = typeof body.lang === 'string' ? body.lang.slice(0, 8) : undefined
  const mime = body.device && typeof body.device === 'object' ? (body.device as { mime?: unknown }).mime : undefined
  const at = new Date()

  // progress so far for this sound
  const progressCol = await progress()
  const doc = await progressCol.findOne({ email: user.email })
  const prev: SoundProgress | undefined = doc?.sounds?.[soundId]
  const count = (prev?.attempts ?? 0) + 1
  const scores = [...(prev?.baselineScores ?? []), internal.score].slice(0, BASELINE_ATTEMPTS)
  // the baseline is fixed once BASELINE_ATTEMPTS scores exist; the attempt that completes it is still "baseline"
  const baseline = prev?.baseline ?? (count >= BASELINE_ATTEMPTS ? median(scores) : null)
  const phase: AttemptDoc['phase'] = prev?.baseline !== null && prev?.baseline !== undefined ? 'tracked' : 'baseline'
  const shownBaseline = phase === 'tracked' ? baseline : null
  const improvement = shownBaseline === null ? null : internal.score - shownBaseline
  const shown: AttemptShown = { ...starsFor(internal.score, shownBaseline), reasonKey }

  const row: AttemptDoc = {
    email: user.email,
    userId: user.id,
    soundId,
    at,
    engine: ENGINE,
    internal,
    baseline: shownBaseline,
    phase,
    improvement,
    shown,
  }
  if (lang) row.lang = lang
  if (typeof mime === 'string') row.device = { mime: mime.slice(0, 64) }

  const next: SoundProgress = {
    attempts: count,
    baseline,
    baselineScores: scores,
    best: Math.max(prev?.best ?? 0, internal.score),
    last: internal.score,
    lastAt: at,
  }
  await Promise.all([
    (await attempts()).insertOne(row),
    progressCol.updateOne(
      { email: user.email },
      { $set: { userId: user.id, [`sounds.${soundId}`]: next, updatedAt: at }, $setOnInsert: { email: user.email } },
      { upsert: true },
    ),
  ])
  json(res, 200, { phase, baseline: shownBaseline, stars: shown.stars, cheerKey: shown.cheerKey, improvement, attempts: count })
}

async function summary(req: Req, res: Res) {
  const user = await requireUser(req)
  const doc = await (await progress()).findOne({ email: user.email })
  const sounds: Record<string, unknown> = {}
  for (const [id, p] of Object.entries(doc?.sounds ?? {})) {
    sounds[id] = { attempts: p.attempts, baseline: p.baseline, best: p.best, last: p.last, lastAt: p.lastAt.toISOString() }
  }
  json(res, 200, { sounds, baselineAttempts: BASELINE_ATTEMPTS })
}

export const ATTEMPTS_CSV_HEADER =
  'time_utc,email,sound,phase,baseline,score,improvement,stars,rank,margin,target_cost,nearest_other,warp,duration_s,voiced,centroid_hz,peak_db,reason,engine,language'

/** One CSV line per attempt. Shared with the manager export, so both files have identical columns. */
export function attemptCsvLine(r: AttemptDoc): string {
  const i = r.internal
  return row([r.at.toISOString(), r.email, r.soundId, r.phase, r.baseline ?? '', i.score, r.improvement ?? '', r.shown.stars, i.rank, f3(i.margin), f3(i.targetCost), i.bestOther ?? '', i.warp, f3(i.duration), f3(i.voiced), Math.round(i.centroid), i.peakDb.toFixed(1), r.shown.reasonKey, r.engine, r.lang ?? ''])
}

async function csv(req: Req, res: Res) {
  const user = await requireUser(req)
  const rows = await (await attempts()).find({ email: user.email }).sort({ at: 1 }).limit(50_000).toArray()
  sendCsv(res, `attempts_${safeName(user.email)}_${stamp()}.csv`, [ATTEMPTS_CSV_HEADER, ...rows.map(attemptCsvLine)])
}

const ROUTES: Record<string, Route> = {
  record: { method: 'POST', run: record },
  summary: { method: 'GET', run: summary },
  csv: { method: 'GET', run: csv },
}

/** Dispatch one attempts action; used by api/attempts/[action].ts on Vercel and by the Vite dev middleware. */
export const handleAttempts = (action: string, req: Req, res: Res): Promise<void> => dispatch('attempts', ROUTES, action, req, res)
