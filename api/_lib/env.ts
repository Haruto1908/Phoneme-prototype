/**
 * Server configuration, all from environment variables (Vercel project settings in production, `.env.local`
 * for `npm run dev`). Nothing here is ever sent to the browser.
 *
 *   MONGODB_URI          required — Atlas connection string
 *   MONGODB_DNS          optional, local dev: resolvers for the +srv lookup, e.g. "1.1.1.1,8.8.8.8"
 *   MONGODB_DB           default "Phoneme-prototype"
 *   USERS_COLLECTION     default "UsersTable"
 *   JWT_SECRET           required in production (any long random string); a fixed dev secret is used locally
 */

export const isProduction = process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')

export function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable ${name}`)
  return v
}

export const env = {
  get mongoUri() {
    return required('MONGODB_URI')
  },
  get dbName() {
    return process.env.MONGODB_DB || 'Phoneme-prototype'
  },
  get usersCollection() {
    return process.env.USERS_COLLECTION || 'UsersTable'
  },
  get jwtSecret() {
    const s = process.env.JWT_SECRET
    if (s) return s
    if (isProduction) throw new Error('Missing environment variable JWT_SECRET')
    return 'dev-only-secret-not-for-production'
  },
}
