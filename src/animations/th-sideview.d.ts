/** Types for th-sideview.js (copied from Others/videos/tongue_anim, where it is developed and previewed). */

export type ThSound = 'θ' | 'ð' | 'ɹ' | 'k' | 'æ' | 't'

export interface ThPortrait {
  src: string
  width: number
  height: number
  [key: string]: unknown
}

export interface ThSideviewOptions {
  sound?: ThSound
  audio?: Partial<Record<ThSound, string>>
  audioElement?: HTMLAudioElement
  portrait?: ThPortrait | null
  theme?: Record<string, string | number>
  onTime?: (t: number) => void
  onEnd?: () => void
}

export interface ThSideview {
  readonly el: SVGSVGElement
  readonly sound: ThSound
  readonly time: number
  readonly playing: boolean
  /** End of the current sound's timeline (seconds). */
  readonly duration: number
  setSound(s: ThSound): void
  play(): void
  stop(): void
  seek(t: number): void
  destroy(): void
}

export interface ThTiming {
  moveStart: number
  reach: number
  /** Stops only: when the closure pops open. */
  release?: number
  holdEnd: number
  rest: number
  soundOn: number
  soundOff: number
  end: number
}
export interface ThSoundConfig {
  voiced: boolean
  word: string
  hint: string
  kind: 'hold' | 'stop'
  jawOpen: number
  timing: ThTiming
  /** Four [title, text] captions: ready · move · sound · back. */
  steps: [string, string][]
}
/** /θ/ timeline (the default); use SOUNDS[s].timing for other sounds. */
export const TIMING: ThTiming
export const SOUNDS: Record<ThSound, ThSoundConfig>
export const PORTRAIT_GIRL: ThPortrait
export function progressAt(t: number, sound?: ThSound): number
export function stepAt(t: number, sound?: ThSound): number
export function createThSideview(container: Element, options?: ThSideviewOptions): ThSideview
