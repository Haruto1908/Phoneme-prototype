/** Vercel serverless entry: /api/attempts/:action → api/_lib/attempts.ts. Locally the same handler is mounted by vite.config.ts. */
import { handleAttempts } from '../_lib/attempts.ts'
import type { Req, Res } from '../_lib/http.ts'

export default async function handler(req: Req, res: Res): Promise<void> {
  const q = req.query?.action
  const action = Array.isArray(q) ? q[0] : (q ?? (req.url ?? '').split('?')[0].split('/').pop() ?? '')
  await handleAttempts(action, req, res)
}
