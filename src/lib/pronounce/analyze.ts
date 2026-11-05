/** Browser side of the scorer: decode a recording / the model clip to 16 kHz mono and run the comparison. */
import { analyze, compare, SR, type Comparison, type Features } from './dsp'

let ctx: AudioContext | null = null
function audioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

/** Decode any browser-playable audio (webm/opus, mp4/aac, mp3, wav) to mono 16 kHz, optionally a [start, end] slice. */
export async function decodeMono16k(data: ArrayBuffer, window?: [number, number] | null): Promise<Float32Array> {
  const decoded = await audioContext().decodeAudioData(data.slice(0))
  const start = Math.max(0, window?.[0] ?? 0)
  const end = Math.min(decoded.duration, window?.[1] ?? decoded.duration)
  const seconds = Math.max(0.05, end - start)
  const off = new OfflineAudioContext(1, Math.ceil(seconds * SR), SR)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start(0, start, seconds)
  const out = await off.startRendering()
  return out.getChannelData(0)
}

const refCache = new Map<string, Promise<Features>>()

/** Features of the model's clip (cached per URL + window). */
export function referenceFeatures(url: string, window: [number, number] | null | undefined): Promise<Features> {
  const key = `${url}#${window ? window.join(',') : ''}`
  let p = refCache.get(key)
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((buf) => decodeMono16k(buf, window))
      .then((pcm) => analyze(pcm))
    refCache.set(key, p)
    p.catch(() => refCache.delete(key))
  }
  return p
}

/** Score a recording against the model's clip. */
export async function scoreRecording(recording: Blob, refUrl: string, refWindow: [number, number] | null | undefined): Promise<Comparison> {
  const [pcm, ref] = await Promise.all([recording.arrayBuffer().then((b) => decodeMono16k(b)), referenceFeatures(refUrl, refWindow)])
  return compare(pcm, ref)
}

/** Resume the shared AudioContext inside a tap (iOS keeps it suspended until a gesture). */
export function unlockAudio(): void {
  const c = audioContext()
  if (c.state === 'suspended') c.resume().catch(() => {})
}
