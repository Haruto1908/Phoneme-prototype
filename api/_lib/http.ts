/** Tiny helpers over Node's req/res, shared by the Vercel functions and the Vite dev middleware. */
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Vercel parses JSON bodies into req.body; the Vite dev server leaves the stream for us to read. */
export type Req = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> }
export type Res = ServerResponse

/** Error with an HTTP status and a short machine-readable code the UI turns into a message. */
export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message = code) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function readJson(req: Req): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (!req.body) return {}
      try {
        return JSON.parse(req.body) as Record<string, unknown>
      } catch {
        throw new HttpError(400, 'bad_json')
      }
    }
    if (typeof req.body !== 'object') throw new HttpError(400, 'bad_json')
    return req.body as Record<string, unknown>
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'bad_json')
  }
}

export function json(res: Res, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export type Route = { method: 'GET' | 'POST'; run: (req: Req, res: Res) => Promise<void> }

/**
 * Run one named route with the shared error policy: HttpError → its status + code; anything else → 500 with
 * `config` when it smells like a missing deployment setting (so the UI can say so) and `server` otherwise.
 */
export async function dispatch(group: string, routes: Record<string, Route>, action: string, req: Req, res: Res): Promise<void> {
  const route = routes[action]
  try {
    if (!route) throw new HttpError(404, 'not_found')
    if (req.method !== route.method) throw new HttpError(405, 'method_not_allowed')
    await route.run(req, res)
  } catch (e) {
    if (e instanceof HttpError) json(res, e.status, { error: e.code })
    else {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`${group}/${action} failed:`, message)
      const config = /environment variable|MONGODB_URI must/.test(message)
      json(res, 500, { error: config ? 'config' : 'server' })
    }
  }
}

export function getCookie(req: Req, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

export function setCookie(res: Res, name: string, value: string, opts: { maxAge: number; secure: boolean }): void {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${opts.maxAge}`]
  if (opts.secure) parts.push('Secure')
  const prev = res.getHeader('Set-Cookie')
  const list = Array.isArray(prev) ? prev : prev ? [String(prev)] : []
  res.setHeader('Set-Cookie', [...list, parts.join('; ')])
}

export function isSecureRequest(req: Req): boolean {
  const proto = req.headers['x-forwarded-proto']
  return (typeof proto === 'string' ? proto.split(',')[0] : proto?.[0]) === 'https'
}
