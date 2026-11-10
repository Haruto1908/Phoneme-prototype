/** Vercel serverless entry: /api/manager/:action → api/_lib/manager.ts. Locally mounted by vite.config.ts. */
import { handleManager } from '../_lib/manager.ts'
import type { Req, Res } from '../_lib/http.ts'

export default async function handler(req: Req, res: Res): Promise<void> {
  const q = req.query?.action
  const action = Array.isArray(q) ? q[0] : (q ?? (req.url ?? '').split('?')[0].split('/').pop() ?? '')
  await handleManager(action, req, res)
}
