/** Client for /api/log (see api/_lib/log.ts): presenter-mode usage per signed-in user. */
import type { Presenter } from '../types'
import { ApiError } from './auth'

export type ModeCounts = Record<Presenter, number>
export interface UsageSummary {
  counts: ModeCounts
  total: number
  lastMode: Presenter | null
  lastAt: string | null
}

export const ZERO_COUNTS: ModeCounts = { avatar: 0, human: 0, both: 0 }

/** Where the browser fetches the CSV; the session cookie does the authentication. */
export const CSV_URL = '/api/log/csv'

async function call<T>(action: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(`/api/log/${action}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      keepalive: method === 'POST',
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!r.ok) throw new ApiError(r.status, typeof data.error === 'string' ? data.error : 'server')
  return data as T
}

export const usageLog = {
  /** Count one use of `mode` (`start` when the app opens, `switch` when the user changes it). */
  mode: (mode: Presenter, event: 'start' | 'switch', lang: string) => call<{ counts: ModeCounts }>('mode', 'POST', { mode, event, lang }).then((d) => d.counts),
  summary: () => call<UsageSummary>('summary', 'GET'),
}
