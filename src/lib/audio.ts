/**
 * Minimal tap-to-play audio for the chart.
 * Every play is triggered by a tap, which is what iOS requires. Clips are preloaded on first render.
 */

export interface Clip {
  src: string
  /** Optional [start, end] in seconds; plays only that part of the file. */
  window?: [number, number] | null
}

const cache = new Map<string, HTMLAudioElement>()
let current: HTMLAudioElement | null = null
let generation = 0 // bumped on every play/stop so an older sequence knows it was superseded

function resolve(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}

function get(path: string): HTMLAudioElement {
  let a = cache.get(path)
  if (!a) {
    a = new Audio(resolve(path))
    a.preload = 'auto'
    cache.set(path, a)
  }
  return a
}

export function preload(paths: Array<string | null | undefined>): void {
  for (const p of paths) if (p) get(p)
}

export function stop(): void {
  generation++
  if (current) {
    current.pause()
    current = null
  }
}

/** Plays one clip (or its window); resolves when done, or at once if it cannot play. */
function playOne(clip: Clip, gen: number): Promise<void> {
  const a = get(clip.src)
  current = a
  const [start, end] = clip.window ?? [0, Number.POSITIVE_INFINITY]
  return new Promise((done) => {
    let timer: number | undefined
    const finish = () => {
      a.removeEventListener('ended', finish)
      a.removeEventListener('error', finish)
      a.removeEventListener('playing', armTimer)
      if (timer) window.clearTimeout(timer)
      if (current === a && generation === gen) {
        a.pause()
        current = null
      }
      done()
    }
    const armTimer = () => {
      if (Number.isFinite(end)) timer = window.setTimeout(finish, Math.max(0, (end - a.currentTime) * 1000))
    }
    a.addEventListener('ended', finish)
    a.addEventListener('error', finish)
    a.addEventListener('playing', armTimer)
    a.currentTime = start
    a.play().catch(finish)
  })
}

/** Plays clips back to back. A later play()/stop() cancels the rest of the sequence. */
export async function play(clips: Clip | Clip[]): Promise<void> {
  stop()
  const gen = generation
  for (const c of Array.isArray(clips) ? clips : [clips]) {
    if (generation !== gen) return
    await playOne(c, gen)
  }
}
