import type { ReactNode } from 'react'
import { useManifest } from './lib/useManifest'
import { HostHeader } from './components/HostHeader'
import { SoundChart } from './components/SoundChart'

/**
 * Chart screen.
 * Operator settings arrive as URL params so the test runner never needs a settings UI:
 *   ?symbols=blast|alt1|alt2   which symbol system the tiles show (default from manifest)
 */
export default function App() {
  const state = useManifest()
  const params = new URLSearchParams(window.location.search)

  if (state.status === 'loading') {
    return <Centered>Loading…</Centered>
  }
  if (state.status === 'error') {
    return <Centered>Could not load the sound chart ({state.message}).</Centered>
  }

  const { manifest } = state
  const requested = params.get('symbols')
  const symbolSystem =
    requested && manifest.symbolSystems.some((s) => s.id === requested) ? requested : manifest.defaultSymbolSystem
  const systemName = manifest.symbolSystems.find((s) => s.id === symbolSystem)?.name ?? symbolSystem

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <HostHeader hostName={manifest.host.name} portrait={manifest.host.portrait} caption={`${manifest.host.name} will say it with you.`} />
      <SoundChart manifest={manifest} symbolSystem={symbolSystem} />
      <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-muted">
        <span>Symbols: {systemName}</span>
        <span>Icons and host portrait are placeholders.</span>
      </footer>
    </main>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8 text-center text-lg font-semibold text-muted">{children}</div>
}
