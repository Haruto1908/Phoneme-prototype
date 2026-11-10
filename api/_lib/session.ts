import { jwtVerify, SignJWT } from 'jose'
import { env } from './env.ts'
import { getCookie, HttpError, isSecureRequest, setCookie, type Req, type Res } from './http.ts'

export const SESSION_COOKIE = 'pp_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * `student` practises; `manager` also reads every student's activity and progress (api/_lib/manager.ts).
 * The role is not in the token — it is looked up from the email per request, so a change to MANAGER_EMAILS
 * takes effect immediately and an old cookie can never carry a stale role.
 */
export type Role = 'student' | 'manager'

export interface SessionUser {
  id: string
  email: string
  role: Role
}

export const roleOf = (email: string): Role => (env.managerEmails.includes(email.trim().toLowerCase()) ? 'manager' : 'student')

const key = () => new TextEncoder().encode(env.jwtSecret)

export async function startSession(req: Req, res: Res, user: Omit<SessionUser, 'role'>): Promise<void> {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key())
  setCookie(res, SESSION_COOKIE, token, { maxAge: MAX_AGE, secure: isSecureRequest(req) })
}

export function endSession(req: Req, res: Res): void {
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0, secure: isSecureRequest(req) })
}

export async function currentUser(req: Req): Promise<SessionUser | null> {
  const token = getCookie(req, SESSION_COOKIE)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] })
    if (!payload.sub || typeof payload.email !== 'string') return null
    return { id: payload.sub, email: payload.email, role: roleOf(payload.email) }
  } catch {
    return null
  }
}

/** The signed-in user, or 401. Every route that touches stored data starts here. */
export async function requireUser(req: Req): Promise<SessionUser> {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'unauthorized')
  return user
}

/** The signed-in user when they are a manager, or 401 / 403. */
export async function requireManager(req: Req): Promise<SessionUser> {
  const user = await requireUser(req)
  if (user.role !== 'manager') throw new HttpError(403, 'forbidden')
  return user
}
