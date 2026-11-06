/** Content manifest. Served as a static file now; the Phoneme API will serve the same shape later. */

/** Whose mouth close-up plays: the avatar, the human teacher, or both one after the other. */
export type Presenter = 'avatar' | 'human' | 'both'

export type TileColor = 'mint' | 'teal' | 'coral' | 'lavender' | 'sun' | 'sky' | 'peach'

export interface SymbolSystem {
  id: string
  name: string
}

export interface Sound {
  id: string
  ipa: string
  /** Symbol shown on the tile, per symbol system id. */
  symbols: Record<string, string>
  /** Simple pronunciation label for the card, without slashes ("th", "r", "æ"). Falls back to `ipa`. */
  card?: string
  exampleWord: string
  /** Picture-cue name (three, feather, rabbit, cat, apple, ten). */
  cue: string
  /** Picture shown on the card for the cue. */
  figure?: string | null
  color: TileColor
  audio: string | null
  /** [start, end] seconds of the audio file to play; the source clips are 3 s with the sound in the middle. */
  audioWindow?: [number, number] | null
  articulation: string
  /** True for voiced sounds; the tile shows a small "buzz" badge so θ and ð read differently. */
  voiced?: boolean
  /** Avatar mouth close-up (3 s, sound in the middle) and its first frame, shown while it loads. */
  video: string | null
  poster?: string | null
  /** Human teacher's mouth close-up for the same sound (Human / Both modes). */
  humanVideo?: string | null
  humanPoster?: string | null
  /** [on, off] seconds where the sound is heard in `video` / `humanVideo`, so a short window can be centred on it. */
  speech?: [number, number] | null
  humanSpeech?: [number, number] | null
  /**
   * Model clips the pronunciation scorer compares against, when the clips shown to the child are not usable as-is
   * (e.g. the teacher's clean /θ/ is in the th_voiced video; the th_voiceless video has her saying "thin").
   * Defaults to `audio` over `speech` plus `humanVideo` over `humanSpeech`. Never shown — scoring only.
   */
  scoreRefs?: ScoreRef[]
  /** Side-view tongue animation that follows the close-up; null when a sound has none. */
  tongue?: TongueView | null
}

export interface ScoreRef {
  /** audio or video file (its soundtrack is used) */
  src: string
  /** [start, end] seconds holding the bare sound; null for the whole file */
  window: [number, number] | null
}

export interface TongueView {
  /** The side-view module (src/animations/th-sideview.js) covers all six prototype sounds. */
  module: 'th'
  sound: 'θ' | 'ð' | 'ɹ' | 'k' | 'æ' | 't'
}

export interface Word {
  id: string
  word: string
  /** Sound ids whose close-ups play in order before the blended word. */
  sequence: string[]
  cue: string
  color: TileColor
  audio: string | null
  audioWindow?: [number, number] | null
}

export interface Manifest {
  version: number
  defaultSymbolSystem: string
  symbolSystems: SymbolSystem[]
  host: { name: string; portrait: string | null; humanName?: string }
  sounds: Sound[]
  words: Word[]
}
