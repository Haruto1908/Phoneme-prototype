/**
 * Pronunciation similarity, in the browser, with no service behind it.
 *
 * The child's recording and the model clips are turned into log-mel spectrogram frames (the usual front end of a
 * speech recogniser): level-normalised per frame, with the broad spectral tilt of the utterance removed (that is
 * where microphone and room colouring live) and frame-to-frame deltas appended (articulation dynamics). Frames are
 * compared by shape (cosine distance of the spectrum and of the deltas) and aligned with dynamic time warping so a
 * slower or faster attempt is not punished.
 *
 * The score is a *contrast*: the attempt is compared with every sound we teach, from every model voice, and what
 * counts is how much closer it is to the target than to its nearest competitor. A microphone or a small voice
 * shifts all the distances together, so the ranking survives where an absolute distance would not.
 *
 * Pure functions over Float32Array — no DOM — so the same code runs in Node for calibration.
 */

export const SR = 16000
/** 50 ms frames: on the 12-clip reference matrix they separate the sounds across speakers clearly better than 25 ms. */
const FRAME = 800
const HOP = 160 // 10 ms
const NFFT = 1024
const N_MEL = 24
/** Number of low-order cosine components of the utterance mean removed as "tilt" (mic / room colouring). */
const TILT_ORDER = 3

export interface Features {
  /** log-mel frames (tilt-removed, level-normalised) with deltas appended: length 2 × N_MEL */
  frames: Float32Array[]
  /** seconds of speech after trimming silence */
  duration: number
  /** share of speech frames that are periodic (voiced) */
  voiced: number
  /** mean spectral centroid of speech frames, Hz */
  centroid: number
  /** peak level, dBFS */
  peakDb: number
}

// ---------- basics ----------

const hann = (() => {
  const w = new Float32Array(FRAME)
  for (let i = 0; i < FRAME; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1))
  return w
})()

/** In-place iterative radix-2 FFT. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr
        re[b] = re[a] - tr; im[b] = im[a] - ti
        re[a] += tr; im[a] += ti
        const ncr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = ncr
      }
    }
  }
}

const hz2mel = (f: number) => 2595 * Math.log10(1 + f / 700)
const mel2hz = (m: number) => 700 * (10 ** (m / 2595) - 1)

const melBank = (() => {
  const bins = NFFT / 2 + 1
  const lo = hz2mel(80), hi = hz2mel(7600)
  const centres = Array.from({ length: N_MEL + 2 }, (_, i) => Math.floor(((bins - 1) * 2 * mel2hz(lo + ((hi - lo) * i) / (N_MEL + 1))) / SR))
  const bank: Array<{ from: number; w: Float32Array }> = []
  for (let m = 0; m < N_MEL; m++) {
    const a = centres[m], b = centres[m + 1], c = Math.max(centres[m + 2], centres[m + 1] + 1)
    const w = new Float32Array(c - a)
    for (let k = a; k < c; k++) w[k - a] = k < b ? (k - a) / Math.max(1, b - a) : (c - k) / Math.max(1, c - b)
    bank.push({ from: a, w })
  }
  return bank
})()

// ---------- analysis ----------

/** Peak level in dBFS. */
export function peakDb(x: Float32Array): number {
  let p = 0
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]))
  return p > 0 ? 20 * Math.log10(p) : -120
}

/**
 * Keep the part of the signal that is within `dropDb` of its loudest 10 ms, with a little padding. 25 dB cuts the
 * breath and room tail around an isolated sound while keeping the quiet onset of a fricative.
 */
export function trimSilence(x: Float32Array, dropDb = 25, padMs = 40): Float32Array {
  const n = Math.floor(x.length / HOP)
  if (n < 2) return x
  const e = new Float64Array(n)
  let max = 0
  for (let f = 0; f < n; f++) {
    let s = 0
    for (let i = f * HOP; i < (f + 1) * HOP; i++) s += x[i] * x[i]
    e[f] = s / HOP
    if (e[f] > max) max = e[f]
  }
  if (max <= 0) return x
  const thr = max / 10 ** (dropDb / 10)
  let a = 0, b = n - 1
  while (a < n && e[a] < thr) a++
  while (b > a && e[b] < thr) b--
  const pad = Math.round((padMs / 1000) * SR)
  return x.subarray(Math.max(0, a * HOP - pad), Math.min(x.length, (b + 1) * HOP + pad))
}

/** Normalised autocorrelation peak in the 80–400 Hz lag range: > 0.5 means a periodic (voiced) frame. */
function periodicity(x: Float32Array, start: number): number {
  const len = 480 // 30 ms
  if (start + len > x.length) return 0
  let e0 = 0
  for (let i = 0; i < len; i++) e0 += x[start + i] * x[start + i]
  if (e0 < 1e-6) return 0
  let best = 0
  for (let lag = 40; lag <= 200; lag++) {
    let s = 0, e1 = 0
    for (let i = 0; i < len - lag; i++) {
      s += x[start + i] * x[start + i + lag]
      e1 += x[start + i + lag] * x[start + i + lag]
    }
    const r = s / Math.sqrt(e0 * e1 + 1e-12)
    if (r > best) best = r
  }
  return best
}

/**
 * Log-mel frames (level-normalised), plus voicing, centroid and duration — for a 16 kHz mono signal.
 * `warp` scales the frequency axis before the mel bank (vocal-tract-length normalisation): a child's formants sit
 * higher than the adult model's, so the recording is analysed at several warps and the best match is kept.
 */
export function analyze(raw: Float32Array, warp = 1): Features {
  const x = trimSilence(raw)
  const nFrames = Math.max(0, Math.floor((x.length - FRAME) / HOP) + 1)
  const re = new Float32Array(NFFT), im = new Float32Array(NFFT)
  const frames: Float32Array[] = []
  const energies: number[] = []
  const centroids: number[] = []
  const periodic: number[] = []
  const bins = NFFT / 2 + 1
  const pow = new Float32Array(bins), warped = new Float32Array(bins)
  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP
    re.fill(0); im.fill(0)
    for (let i = 0; i < FRAME; i++) re[i] = x[off + i] * hann[i]
    fft(re, im)
    let eSum = 0, fSum = 0
    for (let k = 0; k < bins; k++) {
      pow[k] = re[k] * re[k] + im[k] * im[k]
      eSum += pow[k]
      fSum += pow[k] * ((k * SR) / NFFT)
    }
    let src: Float32Array = pow
    if (warp !== 1) {
      // warped[k] = pow[k * warp] (linear interpolation; beyond the top bin → last bin)
      for (let k = 0; k < bins; k++) {
        const p = k * warp
        const i0 = Math.min(bins - 1, Math.floor(p)), i1 = Math.min(bins - 1, i0 + 1)
        const fr = p - i0
        warped[k] = pow[i0] * (1 - fr) + pow[i1] * fr
      }
      src = warped
    }
    const mel = new Float32Array(N_MEL)
    for (let m = 0; m < N_MEL; m++) {
      const { from, w } = melBank[m]
      let s = 0
      for (let j = 0; j < w.length; j++) s += src[from + j] * w[j]
      mel[m] = Math.log(s + 1e-8)
    }
    frames.push(mel)
    energies.push(eSum)
    centroids.push(eSum > 0 ? fSum / eSum : 0)
    periodic.push(periodicity(x, off))
  }
  // speech frames: within 25 dB of the loudest frame
  const eMax = Math.max(1e-12, ...energies)
  const speech = energies.map((e) => e > eMax / 10 ** 2.5)
  const nSpeech = speech.filter(Boolean).length || 1
  // 1. level normalisation per frame (subtract the frame's mean log energy): keeps the spectral shape, which is
  //    what tells one phoneme from another, but drops microphone gain and distance
  const levelled = frames
    .filter((_, i) => speech[i])
    .map((fr) => {
      let mu = 0
      for (let m = 0; m < N_MEL; m++) mu += fr[m] / N_MEL
      return fr.map((v) => v - mu)
    })
  // 2. tilt removal: a cheap microphone or a boomy room colours every frame the same way, as a broad slope across
  //    the bands. Full per-band mean subtraction (CMN) would also erase the sound itself when the whole utterance
  //    is one steady phoneme, so only the smooth part of the utterance mean (its first TILT_ORDER cosine
  //    components) is removed; formant and fricative peaks stay.
  const norm = removeTilt(levelled)
  // 3. deltas: how each band changes frame to frame — the burst of a stop, the glide of /ɹ/ — appended so the
  //    alignment follows articulation, not just the average timbre
  const withDeltas = appendDeltas(norm)
  let voiced = 0, cent = 0
  speech.forEach((s, i) => {
    if (!s) return
    if (periodic[i] > 0.5) voiced++
    cent += centroids[i]
  })
  return { frames: withDeltas, duration: (norm.length * HOP) / SR, voiced: voiced / nSpeech, centroid: cent / nSpeech, peakDb: peakDb(raw) }
}

/** Subtract the smooth (low-order DCT) part of the utterance's mean spectrum from every frame. */
function removeTilt(frames: Float32Array[]): Float32Array[] {
  if (frames.length < 2) return frames
  const mean = new Float64Array(N_MEL)
  for (const fr of frames) for (let m = 0; m < N_MEL; m++) mean[m] += fr[m] / frames.length
  // DCT-II of the mean, keep coefficients 1..TILT_ORDER (0 is already gone through the level norm), invert
  const smooth = new Float64Array(N_MEL)
  for (let k = 1; k <= TILT_ORDER; k++) {
    let c = 0
    for (let m = 0; m < N_MEL; m++) c += mean[m] * Math.cos((Math.PI * k * (m + 0.5)) / N_MEL)
    c *= 2 / N_MEL
    for (let m = 0; m < N_MEL; m++) smooth[m] += c * Math.cos((Math.PI * k * (m + 0.5)) / N_MEL)
  }
  return frames.map((fr) => fr.map((v, m) => v - smooth[m]))
}

/**
 * [static | (next − previous) / 2] per frame, edges clamped. The deltas are not weighted: `dist` compares each half
 * by cosine, so their scale does not matter.
 */
function appendDeltas(frames: Float32Array[]): Float32Array[] {
  const n = frames.length
  return frames.map((fr, i) => {
    const prev = frames[Math.max(0, i - 1)], next = frames[Math.min(n - 1, i + 1)]
    const out = new Float32Array(2 * N_MEL)
    out.set(fr, 0)
    for (let m = 0; m < N_MEL; m++) out[N_MEL + m] = (next[m] - prev[m]) / 2
    return out
  })
}

// ---------- comparison ----------

/** 1 − cosine similarity of a[s..e) and b[s..e): 0 when the shapes agree, up to 2 when they are opposite. */
function cosDist(a: Float32Array, b: Float32Array, s: number, e: number): number {
  let ab = 0, aa = 0, bb = 0
  for (let i = s; i < e; i++) {
    ab += a[i] * b[i]
    aa += a[i] * a[i]
    bb += b[i] * b[i]
  }
  return 1 - ab / Math.sqrt(aa * bb + 1e-12)
}

/**
 * Frame distance: cosine distance of the static spectrum plus cosine distance of the deltas. Comparing shapes
 * rather than Euclidean differences made the reference matrix markedly more speaker-independent (a man's and a
 * woman's /k/ agree in shape while differing a lot in absolute band levels).
 */
function dist(a: Float32Array, b: Float32Array): number {
  const h = a.length >> 1
  return cosDist(a, b, 0, h) + cosDist(a, b, h, a.length)
}

/** DTW alignment cost per step, with a Sakoe–Chiba band so wildly different lengths cannot be "explained away". */
export function dtw(a: Float32Array[], b: Float32Array[], band = 0.35): number {
  const n = a.length, m = b.length
  if (!n || !m) return Infinity
  const w = Math.max(Math.abs(n - m), Math.ceil(Math.max(n, m) * band))
  const INF = Number.POSITIVE_INFINITY
  let prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1).fill(INF)
  let prevLen = new Float64Array(m + 1), curLen = new Float64Array(m + 1)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    cur.fill(INF)
    const jLo = Math.max(1, i - w), jHi = Math.min(m, i + w)
    for (let j = jLo; j <= jHi; j++) {
      const d = dist(a[i - 1], b[j - 1])
      let best = prev[j - 1], len = prevLen[j - 1]           // diagonal
      if (prev[j] < best) { best = prev[j]; len = prevLen[j] }   // up
      if (cur[j - 1] < best) { best = cur[j - 1]; len = curLen[j - 1] } // left
      if (best === INF) continue
      cur[j] = best + d
      curLen[j] = len + 1
    }
    ;[prev, cur] = [cur, prev]
    ;[prevLen, curLen] = [curLen, prevLen]
  }
  return prev[m] === INF ? INF : prev[m] / prevLen[m]
}

// ---------- scoring ----------

/**
 * Tunables of the score mapping, exported so the calibration script can sweep them. Values come from the
 * reference-clip matrix (every model clip scored against every other, with child-voice, noise, band-limit and
 * speed perturbations): see README "Pronunciation score".
 */
export const SCORE = {
  /** margin at which the relative score is 50 (slightly negative: a near tie with another voice's sound is still fair) */
  marginMid: -0.05,
  /** softness of the margin sigmoid */
  marginWidth: 0.14,
  /** target cost at which the absolute term is 50 */
  absMid: 1.65,
  absWidth: 0.35,
  /** share of the score that the absolute term can take away: 0.3 → a clear winner that is still far off caps at 70 */
  absShare: 0.3,
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

/** Legacy absolute mapping (alignment cost → 0–100), kept as a diagnostic field only. */
export function scoreFromCost(cost: number): number {
  if (!Number.isFinite(cost)) return 0
  const s = 100 * (1 - (cost - 0.8) / (2.2 - 0.8))
  return Math.round(Math.max(0, Math.min(100, s)))
}

/**
 * Contrast score 0–100. `margin` = (nearest competitor's cost − target cost) / target cost: positive when the
 * attempt is closer to the target than to any other sound. Soft sigmoid (never a hard 0), scaled down by an
 * absolute term so "nearest to /k/ but far from everything" lands around 70 rather than 100.
 */
export function contrastScore(targetCost: number, bestOtherCost: number): number {
  if (!Number.isFinite(targetCost)) return 0
  const margin = Number.isFinite(bestOtherCost) ? (bestOtherCost - targetCost) / targetCost : 1
  const rel = sigmoid((margin - SCORE.marginMid) / SCORE.marginWidth)
  const abs = sigmoid(-(targetCost - SCORE.absMid) / SCORE.absWidth)
  return Math.round(100 * rel * (1 - SCORE.absShare + SCORE.absShare * abs))
}

/** One sound to compare against: its id and the features of each model voice saying it. */
export interface SoundRef {
  id: string
  voices: Features[]
}

export interface Comparison {
  /** sound the child was asked for */
  target: string
  /** DTW cost against the target: best voice, best warp */
  cost: number
  /** best cost per sound id (target included) */
  costs: Record<string, number>
  /** nearest competitor and its cost */
  bestOther: string | null
  bestOtherCost: number
  /** (bestOtherCost − cost) / cost; > 0 means the target won */
  margin: number
  /** 1 = the target was the closest of all sounds */
  rank: number
  /** contrast score 0–100 (internal; children see stars derived from it) */
  score: number
  /** legacy absolute score, diagnostic */
  absScore: number
  /** frequency warp that matched the target best (≈ 1.2 for a small child against an adult model) */
  warp: number
  user: Features
  ref: Features
}

/** Warps tried for the recording: children up to ~1.35× the adult model, adults with deeper voices down to 0.85×. */
export const WARPS = [0.85, 0.92, 1, 1.08, 1.16, 1.25, 1.35]

/**
 * Compare a recording (16 kHz mono) with every sound: for each sound the best cost over its voices and the warps.
 * The target's best warp is kept for the diagnostics (`user`, `ref`).
 */
export function compareAll(recording: Float32Array, target: string, refs: SoundRef[]): Comparison {
  const costs: Record<string, number> = {}
  let best: { cost: number; warp: number; user: Features; ref: Features } | null = null
  for (const warp of WARPS) {
    const user = analyze(recording, warp)
    for (const s of refs) {
      for (const ref of s.voices) {
        const cost = dtw(user.frames, ref.frames)
        if (!(s.id in costs) || cost < costs[s.id]) costs[s.id] = cost
        if (s.id === target && (!best || cost < best.cost)) best = { cost, warp, user, ref }
      }
    }
  }
  if (!best) throw new Error(`no reference for ${target}`)
  const b = best
  let bestOther: string | null = null, bestOtherCost = Number.POSITIVE_INFINITY
  for (const [id, c] of Object.entries(costs)) if (id !== target && c < bestOtherCost) { bestOther = id; bestOtherCost = c }
  const rank = 1 + Object.entries(costs).filter(([id, c]) => id !== target && c < b.cost).length
  const margin = Number.isFinite(bestOtherCost) ? (bestOtherCost - b.cost) / b.cost : 1
  return {
    target,
    cost: b.cost,
    costs,
    bestOther,
    bestOtherCost,
    margin,
    rank,
    score: contrastScore(b.cost, bestOtherCost),
    absScore: scoreFromCost(b.cost),
    warp: b.warp,
    user: b.user,
    ref: b.ref,
  }
}
