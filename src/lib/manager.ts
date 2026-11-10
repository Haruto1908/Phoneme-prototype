/** Client for /api/manager (see api/_lib/manager.ts): read every student's activity, progress and exports. */
import { ApiError, type Role } from './auth'
import type { ModeCounts } from './log'

export interface SoundRow {
  attempts: number
  /** hidden from the child; the manager sees it to judge progress */
  baseline: number | null
  best: number
  last: number
  lastAt: string
  /** last score − baseline, once the baseline is set */
  improvement: number | null
  bestImprovement: number | null
}

export interface StudentRow {
  email: string
  role: Role
  createdAt: string | null
  lastLoginAt: string | null
  lastSeenAt: string | null
  modes: ModeCounts
  modeTotal: number
  lastMode: string | null
  attempts: number
  avgStars: number | null
  lastAttemptAt: string | null
  sounds: Record<string, SoundRow>
}

export interface StudentsReply {
  students: StudentRow[]
  totals: { students: number; accounts: number; attempts: number; modeEvents: number }
  baselineAttempts: number
}

export interface AttemptRow {
  at: string
  soundId: string
  phase: 'baseline' | 'tracked'
  baseline: number | null
  score: number
  improvement: number | null
  stars: 1 | 2 | 3
  rank: number
  reasonKey: string
  lang: string | null
}

export interface EventRow {
  at: string
  event: 'start' | 'switch'
  mode: keyof ModeCounts
  lang: string | null
}

export interface StudentReply {
  student: StudentRow
  recentAttempts: AttemptRow[]
  recentEvents: EventRow[]
}

/** The four exports the manager can download; the session cookie does the authentication. */
export const CSV_KINDS = ['students', 'progress', 'sessions', 'attempts'] as const
export type CsvKind = (typeof CSV_KINDS)[number]
export const managerCsvUrl = (kind: CsvKind) => `/api/manager/csv?kind=${kind}`

async function call<T>(action: string, query?: Record<string, string>): Promise<T> {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  let r: Response
  try {
    r = await fetch(`/api/manager/${action}${qs}`, { credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) throw new ApiError(r.status, typeof data.error === 'string' ? data.error : 'server')
  return data as T
}

export const managerApi = {
  students: () => call<StudentsReply>('students'),
  student: (email: string) => call<StudentReply>('student', { email }),
}
