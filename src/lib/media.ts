/**
 * Media URLs for the lesson player.
 * Clips are fetched once into blob URLs so every tap starts instantly and a flaky network can't stall a test session.
 * Until a clip has arrived (or if fetching fails) the plain file URL is used instead.
 */

const blobs = new Map<string, string>()
const pending = new Set<string>()

/** Absolute URL for a public/ path, respecting Vite's base. */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

/** URL to give a <video>/<audio> element: the preloaded blob if ready, otherwise the file. */
export function mediaUrl(path: string): string {
  return blobs.get(path) ?? asset(path)
}

export function preloadMedia(paths: Array<string | null | undefined>): void {
  for (const p of paths) {
    if (!p || blobs.has(p) || pending.has(p)) continue
    pending.add(p)
    fetch(asset(p))
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b) => blobs.set(p, URL.createObjectURL(b)))
      .catch(() => {})
      .finally(() => pending.delete(p))
  }
}
