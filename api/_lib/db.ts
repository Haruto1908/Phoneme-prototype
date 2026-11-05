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

// One client per warm serverless instance (and per dev server).
let clientPromise: Promise<MongoClient> | null = null
let indexed = false

function client(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).connect()
    clientPromise.catch(() => {
      clientPromise = null
    })
  }
  return clientPromise
}

export async function users(): Promise<Collection<UserDoc>> {
  const c = await client()
  const col = c.db(env.dbName).collection<UserDoc>(env.usersCollection)
  if (!indexed) {
    indexed = true
    col.createIndex({ email: 1 }, { unique: true }).catch(() => {
      indexed = false
    })
  }
  return col
}
