/**
 * Server configuration, all from environment variables (Vercel project settings in production, `.env.local`
 * for `npm run dev`). Nothing here is ever sent to the browser.
 *
 *   MONGODB_URI          required — Atlas connection string
 *   MONGODB_DNS          optional, local dev: resolvers for the +srv lookup, e.g. "1.1.1.1,8.8.8.8"
 *   MONGODB_DB           default "Phoneme-prototype"
 *   USERS_COLLECTION     default "UsersTable"
 *   USAGE_COLLECTION     default "ModeUsage"      — per-user counters: how often Avatar / Human / Both was used
 *   EVENTS_COLLECTION    default "SessionEvents"  — one row per mode start/switch (the CSV export)
 *   ATTEMPTS_COLLECTION  default "Attempts"       — one row per pronunciation attempt (measurements, no audio)
 *   PROGRESS_COLLECTION  default "Progress"       — per-user, per-sound baseline and running progress
 *   JWT_SECRET           required in production (any long random string); a fixed dev secret is used locally
 */

export const isProduction = process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')

/**
 * Dashboard values are often pasted straight from a .env line, quotes and all. dotenv strips those locally,
 * so do the same here or the Mongo driver sees `"mongodb+srv://…` and rejects the scheme.
 */
function clean(v: string | undefined): string {
  const s = (v ?? '').trim()
  const q = s[0]
  return (q === '"' || q === "'") && s.endsWith(q) && s.length >= 2 ? s.slice(1, -1).trim() : s
}

export function required(name: string): string {
  const v = clean(process.env[name])
  if (!v) throw new Error(`Missing environment variable ${name}`)
  return v
}

export const env = {
  get mongoUri() {
    const uri = required('MONGODB_URI')
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://')
    return uri
  },
  get dbName() {
    return clean(process.env.MONGODB_DB) || 'Phoneme-prototype'
  },
  get usersCollection() {
    return clean(process.env.USERS_COLLECTION) || 'UsersTable'
  },
  get usageCollection() {
    return clean(process.env.USAGE_COLLECTION) || 'ModeUsage'
  },
  get eventsCollection() {
    return clean(process.env.EVENTS_COLLECTION) || 'SessionEvents'
  },
  get attemptsCollection() {
    return clean(process.env.ATTEMPTS_COLLECTION) || 'Attempts'
  },
  get progressCollection() {
    return clean(process.env.PROGRESS_COLLECTION) || 'Progress'
  },
  get jwtSecret() {
    const s = clean(process.env.JWT_SECRET)
    if (s) return s
    if (isProduction) throw new Error('Missing environment variable JWT_SECRET')
    return 'dev-only-secret-not-for-production'
  },
}
