/** Client for /api/auth (see api/_lib/auth.ts). Sessions live in an httpOnly cookie, so nothing is stored here. */

export interface User {
  email: string
}

/** Thrown for any non-2xx reply; `code` maps to an `err.*` string in i18n. */
export class ApiError extends Error {
  code: string
  status: number
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

async function call<T>(action: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  let r: Response
  try {
    r = await fetch(`/api/auth/${action}`, {
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

export const auth = {
  me: () => call<{ user: User }>('me', 'GET').then((d) => d.user),
  signup: (email: string, password: string) => call<{ user: User }>('signup', 'POST', { email, password }).then((d) => d.user),
  login: (email: string, password: string) => call<{ user: User }>('login', 'POST', { email, password }).then((d) => d.user),
  logout: () => call<{ ok: true }>('logout', 'POST'),
}
