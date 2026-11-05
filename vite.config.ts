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
      server.middlewares.use('/api/auth', async (req, res, next) => {
        try {
          const action = (req.url ?? '/').split('?')[0].replace(/^\/+/, '').split('/')[0]
          const mod = (await server.ssrLoadModule('/api/_lib/auth.ts')) as typeof import('./api/_lib/auth.ts')
          await mod.handleAuth(action, req, res)
        } catch (e) {
          next(e)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiDev()],
  server: { host: true, port: 5173 }, // host:true so an iPad on the same Wi-Fi can open the dev URL
  preview: { port: 4173 },
})
