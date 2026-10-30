import { useEffect, useState } from 'react'
import type { Manifest } from '../types'

type State =
  | { status: 'loading' }
  | { status: 'ready'; manifest: Manifest }
  | { status: 'error'; message: string }

const MANIFEST_URL = `${import.meta.env.BASE_URL}manifest.json`

export function useManifest(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(MANIFEST_URL)
      .then(async (r) => {
        if (!r.ok) throw new Error(`manifest: HTTP ${r.status}`)
        return (await r.json()) as Manifest
      })
      .then((manifest) => {
        if (!cancelled) setState({ status: 'ready', manifest })
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
