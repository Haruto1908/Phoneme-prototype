/**
 * Email + password accounts, each with a primary language.
 *
 *   POST /api/auth/signup    { email, password, lang? }  → creates the account and starts the session
 *   POST /api/auth/login     { email, password }         → session
 *   POST /api/auth/logout
 *   GET  /api/auth/me                                    → { user } or 401
 *   POST /api/auth/language  { lang }                    → saves the primary language → { user }
 *   POST /api/auth/child     { child }                   → saves the side-view child ('auto' | region) → { user }
 *
 * `user` is `{ email, role, lang, child }`. `child` is 'auto' (pick the child from `lang`) or a region id
 * (api/_lib/child.ts). The role comes from the email (see session.ts) and decides whether the manager
 * dashboard is offered. `lang` is the account's primary language (api/_lib/lang.ts) — every system message follows
 * it — or null on an account made before languages were stored (the client then saves the one in use). Errors are
 * `{ error: code }` with codes the UI translates (see i18n `err.*`).
 */
import bcrypt from 'bcryptjs'
import { users, type UserDoc } from './db.ts'
import { dispatch, HttpError, json, readJson, type Req, type Res, type Route } from './http.ts'
import { normLang } from './lang.ts'
import { normChild } from './child.ts'
import { endSession, requireUser, roleOf, startSession } from './session.ts'

const normEmail = (v: unknown) => String(v ?? '').trim().toLowerCase()
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254

/** What the client is told about an account. */
const publicUser = (email: string, doc: Pick<UserDoc, 'lang' | 'child'> | null) => ({
  email,
  role: roleOf(email),
  lang: normLang(doc?.lang),
  child: normChild(doc?.child) ?? 'auto',
})

async function signup(req: Req, res: Res) {
  const body = await readJson(req)
  const email = normEmail(body.email)
  const password = String(body.password ?? '')
  // an unknown or missing language falls back to English rather than refusing the sign-up
  const lang = normLang(body.lang) ?? 'en'
  if (!validEmail(email)) throw new HttpError(400, 'invalid_email')
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password')
  const col = await users()
  if (await col.findOne({ email })) throw new HttpError(409, 'email_taken')
  const passwordHash = await bcrypt.hash(password, 10)
  const now = new Date()
  let id: string
  try {
    const r = await col.insertOne({ email, passwordHash, createdAt: now, lastLoginAt: now, lang, langUpdatedAt: now })
    id = String(r.insertedId)
  } catch (e) {
    // two sign-ups raced on the unique index
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, 'email_taken')
    throw e
  }
  await startSession(req, res, { id, email })
  json(res, 200, { user: publicUser(email, { lang }) })
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
  json(res, 200, { user: publicUser(email, user) })
}

async function logout(req: Req, res: Res) {
  endSession(req, res)
  json(res, 200, { ok: true })
}

async function me(req: Req, res: Res) {
  const user = await requireUser(req)
  const doc = await (await users()).findOne({ email: user.email }, { projection: { lang: 1, child: 1 } })
  json(res, 200, { user: publicUser(user.email, doc) })
}

/** Change the signed-in account's primary language. */
async function language(req: Req, res: Res) {
  const user = await requireUser(req)
  const body = await readJson(req)
  const lang = normLang(body.lang)
  if (!lang) throw new HttpError(400, 'bad_lang')
  const col = await users()
  await col.updateOne({ email: user.email }, { $set: { lang, langUpdatedAt: new Date() } })
  const doc = await col.findOne({ email: user.email }, { projection: { child: 1 } })
  json(res, 200, { user: publicUser(user.email, { lang, child: doc?.child }) })
}

/** Choose the side-view child: 'auto' (follows the primary language) or one region's child. */
async function child(req: Req, res: Res) {
  const user = await requireUser(req)
  const body = await readJson(req)
  const choice = normChild(body.child)
  if (!choice) throw new HttpError(400, 'bad_child')
  const col = await users()
  await col.updateOne({ email: user.email }, { $set: { child: choice } })
  const doc = await col.findOne({ email: user.email }, { projection: { lang: 1 } })
  json(res, 200, { user: publicUser(user.email, { lang: doc?.lang, child: choice }) })
}

const ROUTES: Record<string, Route> = {
  signup: { method: 'POST', run: signup },
  login: { method: 'POST', run: login },
  logout: { method: 'POST', run: logout },
  me: { method: 'GET', run: me },
  language: { method: 'POST', run: language },
  child: { method: 'POST', run: child },
}

/** Dispatch one auth action; used by api/auth/[action].ts on Vercel and by the Vite dev middleware. */
export const handleAuth = (action: string, req: Req, res: Res): Promise<void> => dispatch('auth', ROUTES, action, req, res)
