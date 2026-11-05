/**
 * Pronunciation similarity, in the browser, with no service behind it.
 *
 * The child's recording and the model's clip are both turned into log-mel spectrogram frames (the usual front end
 * of a speech recogniser), mean-normalised per utterance so microphone and room colouring drop out, and aligned
 * with dynamic time warping so a slower or faster attempt is not punished. The alignment cost becomes a 0–100
 * score; a few extra measurements (voicing, length, loudness, brightness) feed the one-line reason.
 *
 * Pure functions over Float32Array — no DOM — so the same code runs in Node for calibration.
 */

export const SR = 16000
const FRAME = 400 // 25 ms
const HOP = 160 // 10 ms
const NFFT = 512
const N_MEL = 24

export interface Features {
  /** log-mel frames, mean-normalised per band */
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

/** Keep the part of the signal that is within `dropDb` of its loudest 10 ms, with a little padding. */
export function trimSilence(x: Float32Array, dropDb = 30, padMs = 60): Float32Array {
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
  // level normalisation per frame (subtract the frame's mean log energy): keeps the spectral shape, which is what
  // tells one phoneme from another, but drops microphone gain and distance
  const norm = frames
    .filter((_, i) => speech[i])
    .map((fr) => {
      let mu = 0
      for (let m = 0; m < N_MEL; m++) mu += fr[m] / N_MEL
      return fr.map((v) => v - mu)
    })
  let voiced = 0, cent = 0
  speech.forEach((s, i) => {
    if (!s) return
    if (periodic[i] > 0.5) voiced++
    cent += centroids[i]
  })
  return { frames: norm, duration: (norm.length * HOP) / SR, voiced: voiced / nSpeech, centroid: cent / nSpeech, peakDb: peakDb(raw) }
}

// ---------- comparison ----------

function dist(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return Math.sqrt(s / a.length)
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

/**
 * Alignment cost → 0–100. Calibrated on the prototype clips: the model compared with itself slowed/sped up,
 * pitch-shifted up to 25 % (child voice), band-limited, noisy or echoey costs 0.2–0.9 (→ 100–76); the closest
 * pair of *different* sounds (/θ/ vs /t/) costs 1.22 (→ 58) and most wrong sounds cost ≥ 2 (→ ≤ 12).
 */
export function scoreFromCost(cost: number): number {
  if (!Number.isFinite(cost)) return 0
  const LO = 0.5
  const HI = 2.2
  const s = 100 * (1 - (cost - LO) / (HI - LO))
  return Math.round(Math.max(0, Math.min(100, s)))
}

export interface Comparison {
  cost: number
  score: number
  /** frequency warp that matched best (≈ 1.2 for a small child against an adult model) */
  warp: number
  user: Features
  ref: Features
}

/** Warps tried for the recording: children up to ~1.35× the adult model, adults with deeper voices down to 0.85×. */
export const WARPS = [0.85, 0.92, 1, 1.08, 1.16, 1.25, 1.35]

/** Compare a recording (16 kHz mono) with the reference features: best DTW cost over the warps. */
export function compare(recording: Float32Array, ref: Features): Comparison {
  let best: Comparison | null = null
  for (const warp of WARPS) {
    const user = analyze(recording, warp)
    const cost = dtw(user.frames, ref.frames)
    if (!best || cost < best.cost) best = { cost, score: scoreFromCost(cost), warp, user, ref }
  }
  return best as Comparison
}
