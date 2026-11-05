/**
 * Email + password accounts.
 *
 *   POST /api/auth/signup  { email, password }  → creates the account and starts the session
 *   POST /api/auth/login   { email, password }  → session
 *   POST /api/auth/logout
 *   GET  /api/auth/me                           → { user } or 401
 *
 * Errors are `{ error: code }` with codes the UI translates (see i18n `err.*`).
 */
import bcrypt from 'bcryptjs'
import { users } from './db.ts'
import { HttpError, json, readJson, type Req, type Res } from './http.ts'
import { currentUser, endSession, startSession } from './session.ts'

const normEmail = (v: unknown) => String(v ?? '').trim().toLowerCase()
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

async function signup(req: Req, res: Res) {
  const body = await readJson(req)
  const email = normEmail(body.email)
  const password = String(body.password ?? '')
  if (!validEmail(email)) throw new HttpError(400, 'invalid_email')
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password')
  const col = await users()
  if (await col.findOne({ email })) throw new HttpError(409, 'email_taken')
  const passwordHash = await bcrypt.hash(password, 10)
  const now = new Date()
  let id: string
  try {
    const r = await col.insertOne({ email, passwordHash, createdAt: now, lastLoginAt: now })
    id = String(r.insertedId)
  } catch (e) {
    // two sign-ups raced on the unique index
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, 'email_taken')
    throw e
  }
  await startSession(req, res, { id, email })
  json(res, 200, { user: { email } })
}

async function login(req: Req, res: Res) {
  const body = await readJson(req)
  const email = normEmail(body.email)
  const password = String(body.password ?? '')
  const col = await users()
  const user = await col.findOne({ email })
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false
  if (!user || !ok) throw new HttpError(401, 'bad_credentials')
  await col.updateOne({ email }, { $set: { lastLoginAt: new Date() } })
  await startSession(req, res, { id: String(user._id), email })
  json(res, 200, { user: { email } })
}

async function logout(req: Req, res: Res) {
  endSession(req, res)
  json(res, 200, { ok: true })
}

async function me(req: Req, res: Res) {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'unauthorized')
  json(res, 200, { user: { email: user.email } })
}

const ROUTES: Record<string, { method: 'GET' | 'POST'; run: (req: Req, res: Res) => Promise<void> }> = {
  signup: { method: 'POST', run: signup },
  login: { method: 'POST', run: login },
  logout: { method: 'POST', run: logout },
  me: { method: 'GET', run: me },
}

/** Dispatch one auth action; used by api/auth/[action].ts on Vercel and by the Vite dev middleware. */
export async function handleAuth(action: string, req: Req, res: Res): Promise<void> {
  const route = ROUTES[action]
  try {
    if (!route) throw new HttpError(404, 'not_found')
    if (req.method !== route.method) throw new HttpError(405, 'method_not_allowed')
    await route.run(req, res)
  } catch (e) {
    if (e instanceof HttpError) json(res, e.status, { error: e.code })
    else {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`auth/${action} failed:`, message)
      // a missing / malformed environment variable is a deployment problem, not a user one: say so
      const config = /environment variable|MONGODB_URI must/.test(message)
      json(res, 500, { error: config ? 'config' : 'server' })
    }
  }
}
