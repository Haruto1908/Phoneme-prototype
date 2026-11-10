/**
 * Session log: which presenter mode (Avatar / Human / Both) each signed-in user uses, and how often.
 *
 *   POST /api/log/mode     { mode, event?: 'start'|'switch', lang? } → { counts }   records one use of `mode`
 *   GET  /api/log/summary                                            → { counts, total, lastMode, lastAt }
 *   GET  /api/log/csv                                                → text/csv download of the user's events
 *
 * Two collections (see env.ts): ModeUsage keeps one counter document per user, SessionEvents keeps every
 * event, so the CSV can show the full timeline. All routes need the session cookie; a user only ever sees
 * their own rows.
 */
import { row, safeName, sendCsv, stamp } from './csv.ts'
import { events, MODES, usage, type EventDoc, type Mode, type ModeCounts } from './db.ts'
import { dispatch, HttpError, json, readJson, type Req, type Res, type Route } from './http.ts'
import { requireUser } from './session.ts'

const ZERO: ModeCounts = { avatar: 0, human: 0, both: 0 }
const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v)

export function normCounts(c: Partial<ModeCounts> | undefined): ModeCounts {
  return { avatar: c?.avatar ?? 0, human: c?.human ?? 0, both: c?.both ?? 0 }
}

async function mode(req: Req, res: Res) {
  const user = await requireUser(req)
  const body = await readJson(req)
  if (!isMode(body.mode)) throw new HttpError(400, 'bad_mode')
  const event: EventDoc['event'] = body.event === 'start' ? 'start' : 'switch'
  const lang = typeof body.lang === 'string' ? body.lang.slice(0, 8) : undefined
  const at = new Date()
  const row: EventDoc = { email: user.email, userId: user.id, event, mode: body.mode, at }
  if (lang) row.lang = lang
  const [, doc] = await Promise.all([
    (await events()).insertOne(row),
    (await usage()).findOneAndUpdate(
      { email: user.email },
      {
        $inc: { [`counts.${body.mode}`]: 1 },
        $set: { userId: user.id, lastMode: body.mode, lastAt: at },
        $setOnInsert: { email: user.email, firstAt: at },
      },
      { upsert: true, returnDocument: 'after' },
    ),
  ])
  json(res, 200, { counts: normCounts(doc?.counts) })
}

async function summary(req: Req, res: Res) {
  const user = await requireUser(req)
  const doc = await (await usage()).findOne({ email: user.email })
  const counts = normCounts(doc?.counts)
  json(res, 200, {
    counts,
    total: counts.avatar + counts.human + counts.both,
    lastMode: doc?.lastMode ?? null,
    lastAt: doc?.lastAt ? doc.lastAt.toISOString() : null,
  })
}

export const SESSION_CSV_HEADER = 'time_utc,email,event,mode,language,avatar_total,human_total,both_total'

/** The user's events in order, with the running per-mode totals that the header promises. */
export function sessionCsvLines(rows: EventDoc[]): string[] {
  const running: ModeCounts = { ...ZERO }
  return rows.map((r) => {
    running[r.mode] = (running[r.mode] ?? 0) + 1
    return row([r.at.toISOString(), r.email, r.event, r.mode, r.lang ?? '', running.avatar, running.human, running.both])
  })
}

async function csv(req: Req, res: Res) {
  const user = await requireUser(req)
  const rows = await (await events()).find({ email: user.email }).sort({ at: 1 }).limit(50_000).toArray()
  sendCsv(res, `session-log_${safeName(user.email)}_${stamp()}.csv`, [SESSION_CSV_HEADER, ...sessionCsvLines(rows)])
}

const ROUTES: Record<string, Route> = {
  mode: { method: 'POST', run: mode },
  summary: { method: 'GET', run: summary },
  csv: { method: 'GET', run: csv },
}

/** Dispatch one log action; used by api/log/[action].ts on Vercel and by the Vite dev middleware. */
export const handleLog = (action: string, req: Req, res: Res): Promise<void> => dispatch('log', ROUTES, action, req, res)
