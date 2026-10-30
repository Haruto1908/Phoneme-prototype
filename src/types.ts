/** Content manifest. Served as a static file now; the Phoneme API will serve the same shape later. */

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
  exampleWord: string
  /** Picture-cue name. Rendered as a placeholder until the designer's icons arrive. */
  cue: string
  color: TileColor
  audio: string | null
  /** [start, end] seconds of the audio file to play; the source clips are 3 s with the sound in the middle. */
  audioWindow?: [number, number] | null
  articulation: string
  /** True for voiced sounds; the tile shows a small "buzz" badge so θ and ð read differently. */
  voiced?: boolean
}

export interface Word {
  id: string
  word: string
  /** Sound ids played in order before the blended word. */
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
  host: { name: string; portrait: string | null }
  sounds: Sound[]
  words: Word[]
}
