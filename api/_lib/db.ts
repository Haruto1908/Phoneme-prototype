import { setServers } from 'node:dns'
import { MongoClient, type Collection, type ObjectId } from 'mongodb'
import { env } from './env.ts'

// `mongodb+srv://` needs an SRV lookup, which some home/office resolvers refuse (Node asks the system DNS
// directly). MONGODB_DNS="1.1.1.1,8.8.8.8" routes those lookups to public resolvers — a local-dev aid.
if (process.env.MONGODB_DNS) setServers(process.env.MONGODB_DNS.split(',').map((s) => s.trim()).filter(Boolean))

export interface UserDoc {
  _id?: ObjectId
  /** lower-cased, trimmed */
  email: string
  passwordHash: string
  createdAt: Date
  lastLoginAt?: Date
}

/** Presenter modes, mirrored from src/types.ts (the API must not import browser code). */
export const MODES = ['avatar', 'human', 'both'] as const
export type Mode = (typeof MODES)[number]
export type ModeCounts = Record<Mode, number>

/** One document per user: how many times each presenter mode was used (started or switched to). */
export interface UsageDoc {
  _id?: ObjectId
  email: string
  userId: string
  counts: ModeCounts
  /** mode in use when the counters were last touched */
  lastMode: Mode
  firstAt: Date
  lastAt: Date
}

/** One row per mode event — the raw session log behind the CSV export. */
export interface EventDoc {
  _id?: ObjectId
  email: string
  userId: string
  /** `start`: the app opened in this mode · `switch`: the user changed to this mode */
  event: 'start' | 'switch'
  mode: Mode
  /** UI language at the time, for context */
  lang?: string
  at: Date
}

// One client per warm serverless instance (and per dev server).
let clientPromise: Promise<MongoClient> | null = null
const indexed = new Set<string>()

function client(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).connect()
    clientPromise.catch(() => {
      clientPromise = null
    })
  }
  return clientPromise
}

/** Collection handle with its index ensured once per process (retried if that failed). */
async function collection<T extends { _id?: ObjectId }>(name: string, index: Record<string, 1 | -1>, unique = false): Promise<Collection<T>> {
  const c = await client()
  const col = c.db(env.dbName).collection<T>(name)
  if (!indexed.has(name)) {
    indexed.add(name)
    col.createIndex(index, { unique }).catch(() => {
      indexed.delete(name)
    })
  }
  return col
}

export const users = () => collection<UserDoc>(env.usersCollection, { email: 1 }, true)
export const usage = () => collection<UsageDoc>(env.usageCollection, { email: 1 }, true)
export const events = () => collection<EventDoc>(env.eventsCollection, { email: 1, at: 1 })
