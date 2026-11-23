import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Serves the Vercel functions in api/ during `npm run dev` so the app works locally without the Vercel CLI.
 * Environment variables come from .env / .env.local (see api/_lib/env.ts for the list).
 */
function apiDev(): Plugin {
  return {
    name: 'phoneme-api-dev',
    apply: 'serve',
    configureServer(server) {
      const vars = loadEnv(server.config.mode, server.config.root, '')
      for (const [k, v] of Object.entries(vars)) if (process.env[k] === undefined) process.env[k] = v
      const mount = (prefix: string, file: string, name: 'handleAuth' | 'handleLog' | 'handleAttempts' | 'handleManager') =>
        server.middlewares.use(prefix, async (req, res, next) => {
          try {
            const action = (req.url ?? '/').split('?')[0].replace(/^\/+/, '').split('/')[0]
            const mod = (await server.ssrLoadModule(file)) as Record<string, (a: string, q: typeof req, s: typeof res) => Promise<void>>
            await mod[name](action, req, res)
          } catch (e) {
            next(e)
          }
        })
      mount('/api/auth', '/api/_lib/auth.ts', 'handleAuth')
      mount('/api/log', '/api/_lib/log.ts', 'handleLog')
      mount('/api/attempts', '/api/_lib/attempts.ts', 'handleAttempts')
      mount('/api/manager', '/api/_lib/manager.ts', 'handleManager')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDev()],
  // The dev server listens on this computer only. It runs the API with the real database credentials and is not
  // hardened for a network (GHSA-p4f5-76q4-ffq7 let a crafted request run code in an exposed Vite dev server), so
  // opening it to the Wi-Fi (e.g. to test on an iPad) is a deliberate, temporary step: `npm run dev:lan`, on a
  // trusted network only, and stopped afterwards.
  server: { host: 'localhost', port: 5173 },
  preview: { port: 4173 },
})
