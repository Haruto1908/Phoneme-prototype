/**
 * Manager view: every student's session activity and progress, read-only, plus CSV exports.
 *
 *   GET /api/manager/students                 → { students, totals, baselineAttempts }
 *   GET /api/manager/student?email=…          → one student with their recent attempts and mode events
 *   GET /api/manager/csv?kind=…               → students | progress | sessions | attempts (all students)
 *
 * Who is a manager comes from MANAGER_EMAILS (see env.ts), checked on every request against the signed email
 * in the session cookie — so the role cannot be set from the browser and a manager can be added by changing
 * one setting. Everything here is a read: no route writes to a student's data.
 *
 * The export is deliberately flat and complete: it is the hand-off to the AI agent that will watch usage,
 * recommend global changes and tune settings per student.
 */
import { row, safeName, sendCsv, stamp } from './csv.ts'
import { attempts, BASELINE_ATTEMPTS, events, progress, usage, users, type EventDoc, type ModeCounts, type SoundProgress } from './db.ts'
import { dispatch, HttpError, json, type Req, type Res, type Route } from './http.ts'
import { requireManager, roleOf, type Role } from './session.ts'
import { ATTEMPTS_CSV_HEADER, attemptCsvLine } from './attempts.ts'
import { normCounts, SESSION_CSV_HEADER, sessionCsvLines } from './log.ts'

/** Plenty for the prototype, and a guard against one huge response. */
const MAX_STUDENTS = 500
const MAX_CSV_ROWS = 100_000
const RECENT = 50

/** Per-sound figures the dashboard shows. `improvement` is the latest score against the hidden baseline. */
interface SoundRow {
  attempts: number
  baseline: number | null
  best: number
  last: number
  lastAt: string
  improvement: number | null
  bestImprovement: number | null
}

/** One row of the manager's student table. */
interface StudentRow {
  email: string
  role: Role
  createdAt: string | null
  lastLoginAt: string | null
  /** most recent sign of life: login, mode switch or attempt */
  lastSeenAt: string | null
  modes: ModeCounts
  modeTotal: number
  lastMode: string | null
  attempts: number
  avgStars: number | null
  lastAttemptAt: string | null
  /** sounds this student has practised */
  sounds: Record<string, SoundRow>
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const latest = (...dates: Array<Date | null | undefined>): Date | null =>
  dates.reduce<Date | null>((a, b) => (b && (!a || b > a) ? b : a), null)

function soundRow(p: SoundProgress): SoundRow {
  return {
    attempts: p.attempts,
    baseline: p.baseline,
    best: p.best,
    last: p.last,
    lastAt: p.lastAt.toISOString(),
    improvement: p.baseline === null ? null : p.last - p.baseline,
    bestImprovement: p.baseline === null ? null : p.best - p.baseline,
  }
}

/**
 * Build every student's row from four small reads (accounts, mode counters, progress, attempt totals) rather
 * than a join: the collections are per-user documents keyed by email, so this stays one pass over each.
 */
async function buildRows(): Promise<StudentRow[]> {
  const [usersCol, usageCol, progressCol, attemptsCol] = await Promise.all([users(), usage(), progress(), attempts()])
  const [accounts, counters, progressDocs, attemptTotals] = await Promise.all([
    usersCol.find({}, { projection: { email: 1, createdAt: 1, lastLoginAt: 1 } }).limit(MAX_STUDENTS).toArray(),
    usageCol.find({}).limit(MAX_STUDENTS).toArray(),
    progressCol.find({}).limit(MAX_STUDENTS).toArray(),
    attemptsCol
      .aggregate<{ _id: string; attempts: number; avgStars: number | null; lastAt: Date }>([
        { $group: { _id: '$email', attempts: { $sum: 1 }, avgStars: { $avg: '$shown.stars' }, lastAt: { $max: '$at' } } },
      ])
      .toArray(),
  ])

  const byEmail = new Map(counters.map((c) => [c.email, c]))
  const progressByEmail = new Map(progressDocs.map((p) => [p.email, p]))
  const attemptsByEmail = new Map(attemptTotals.map((a) => [a._id, a]))

  const rows = accounts.map((a) => {
    const counts = normCounts(byEmail.get(a.email)?.counts)
    const modeDoc = byEmail.get(a.email)
    const att = attemptsByEmail.get(a.email)
    const sounds: Record<string, SoundRow> = {}
    for (const [id, p] of Object.entries(progressByEmail.get(a.email)?.sounds ?? {})) sounds[id] = soundRow(p)
    return {
      email: a.email,
      role: roleOf(a.email),
      createdAt: iso(a.createdAt),
      lastLoginAt: iso(a.lastLoginAt),
      lastSeenAt: iso(latest(a.lastLoginAt, modeDoc?.lastAt, att?.lastAt)),
      modes: counts,
      modeTotal: counts.avatar + counts.human + counts.both,
      lastMode: modeDoc?.lastMode ?? null,
      attempts: att?.attempts ?? 0,
      avgStars: att?.avgStars ?? null,
      lastAttemptAt: iso(att?.lastAt),
      sounds,
    }
  })
  // most recently active first — that is what a teacher opens the page to see
  rows.sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''))
  return rows
}

async function students(req: Req, res: Res) {
  await requireManager(req)
  const rows = await buildRows()
  json(res, 200, {
    students: rows,
    totals: {
      students: rows.filter((r) => r.role === 'student').length,
      accounts: rows.length,
      attempts: rows.reduce((n, r) => n + r.attempts, 0),
      modeEvents: rows.reduce((n, r) => n + r.modeTotal, 0),
    },
    baselineAttempts: BASELINE_ATTEMPTS,
  })
}

const normEmail = (v: unknown) => String(Array.isArray(v) ? v[0] : (v ?? '')).trim().toLowerCase().slice(0, 254)

/** One student in full: their row, their last attempts and their last mode events. */
async function student(req: Req, res: Res) {
  await requireManager(req)
  const url = new URL(req.url ?? '/', 'http://localhost')
  const email = normEmail(req.query?.email ?? url.searchParams.get('email'))
  if (!email) throw new HttpError(400, 'bad_email')
  const found = (await buildRows()).find((r) => r.email === email)
  if (!found) throw new HttpError(404, 'not_found')
  const [attemptRows, eventRows] = await Promise.all([
    (await attempts()).find({ email }).sort({ at: -1 }).limit(RECENT).toArray(),
    (await events()).find({ email }).sort({ at: -1 }).limit(RECENT).toArray(),
  ])
  json(res, 200, {
    student: found,
    recentAttempts: attemptRows.map((a) => ({
      at: a.at.toISOString(),
      soundId: a.soundId,
      phase: a.phase,
      baseline: a.baseline,
      score: a.internal.score,
      improvement: a.improvement,
      stars: a.shown.stars,
      rank: a.internal.rank,
      reasonKey: a.shown.reasonKey,
      lang: a.lang ?? null,
    })),
    recentEvents: eventRows.map((e: EventDoc) => ({ at: e.at.toISOString(), event: e.event, mode: e.mode, lang: e.lang ?? null })),
  })
}

const KINDS = ['students', 'progress', 'sessions', 'attempts'] as const
type Kind = (typeof KINDS)[number]

async function studentsCsv(): Promise<string[]> {
  const rows = await buildRows()
  return [
    'email,role,signed_up_utc,last_login_utc,last_seen_utc,mode_avatar,mode_human,mode_both,mode_total,last_mode,attempts,avg_stars,sounds_practised,last_attempt_utc',
    ...rows.map((r) =>
      row([r.email, r.role, r.createdAt ?? '', r.lastLoginAt ?? '', r.lastSeenAt ?? '', r.modes.avatar, r.modes.human, r.modes.both, r.modeTotal, r.lastMode ?? '', r.attempts, r.avgStars === null ? '' : r.avgStars.toFixed(2), Object.keys(r.sounds).length, r.lastAttemptAt ?? '']),
    ),
  ]
}

async function progressCsv(): Promise<string[]> {
  const rows = await buildRows()
  const lines = ['email,role,sound,attempts,baseline,best,last,improvement,best_improvement,last_attempt_utc']
  for (const r of rows) {
    for (const [id, s] of Object.entries(r.sounds).sort(([a], [b]) => a.localeCompare(b))) {
      lines.push(row([r.email, r.role, id, s.attempts, s.baseline ?? '', s.best, s.last, s.improvement ?? '', s.bestImprovement ?? '', s.lastAt]))
    }
  }
  return lines
}

async function sessionsCsv(): Promise<string[]> {
  // the running totals are per student, so group the events by email before numbering them
  const rows = await (await events()).find({}).sort({ email: 1, at: 1 }).limit(MAX_CSV_ROWS).toArray()
  const byEmail = new Map<string, EventDoc[]>()
  for (const r of rows) {
    const list = byEmail.get(r.email)
    if (list) list.push(r)
    else byEmail.set(r.email, [r])
  }
  return [SESSION_CSV_HEADER, ...[...byEmail.values()].flatMap(sessionCsvLines)]
}

async function attemptsCsv(): Promise<string[]> {
  const rows = await (await attempts()).find({}).sort({ email: 1, at: 1 }).limit(MAX_CSV_ROWS).toArray()
  return [ATTEMPTS_CSV_HEADER, ...rows.map(attemptCsvLine)]
}

const BUILDERS: Record<Kind, () => Promise<string[]>> = {
  students: studentsCsv,
  progress: progressCsv,
  sessions: sessionsCsv,
  attempts: attemptsCsv,
}

async function csv(req: Req, res: Res) {
  const manager = await requireManager(req)
  const url = new URL(req.url ?? '/', 'http://localhost')
  const raw = req.query?.kind ?? url.searchParams.get('kind') ?? 'students'
  const kind = String(Array.isArray(raw) ? raw[0] : raw) as Kind
  if (!KINDS.includes(kind)) throw new HttpError(400, 'bad_kind')
  const lines = await BUILDERS[kind]()
  sendCsv(res, `all-${kind}_${safeName(manager.email)}_${stamp()}.csv`, lines)
}

const ROUTES: Record<string, Route> = {
  students: { method: 'GET', run: students },
  student: { method: 'GET', run: student },
  csv: { method: 'GET', run: csv },
}

/** Dispatch one manager action; used by api/manager/[action].ts on Vercel and by the Vite dev middleware. */
export const handleManager = (action: string, req: Req, res: Res): Promise<void> => dispatch('manager', ROUTES, action, req, res)

export type { SoundRow, StudentRow }
