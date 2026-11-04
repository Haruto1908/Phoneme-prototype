/** UI strings. English for the Blast team, Japanese for the expert review; the EN/JP toggle in the top bar switches. */

export type Lang = 'en' | 'jp'

const STRINGS = {
  title: { en: 'phoneme-prototype', jp: 'phoneme-prototype' },
  presenter: { en: 'Who shows the sound', jp: 'だれが見せる？' },
  avatar: { en: 'Avatar', jp: 'アバター' },
  human: { en: 'Human', jp: '人' },
  both: { en: 'Both', jp: '両方' },
  subtitle: { en: '{host} will say it with you.', jp: '{host}といっしょに言ってみよう。' },
  sounds: { en: 'Sounds', jp: 'おと' },
  tapHint: { en: 'Tap a sound to watch and listen.', jp: 'おとをタップすると、見て聞けるよ。' },
  langLabel: { en: 'Language', jp: '言語' },
  soundOn: { en: 'Sound on', jp: 'おと オン' },
  soundOff: { en: 'Sound off', jp: 'おと オフ' },
  practice: { en: 'Practice', jp: 'れんしゅう' },
  practiceHint: { en: 'On: a sound opens in a pop-up. Off: it plays in the side panel.', jp: 'オン: ポップアップで再生。オフ: 右のパネルで再生。' },
  watch: { en: 'Watch', jp: 'みる' },
  idlePanel: { en: 'Tap a sound and watch here.', jp: 'おとをタップすると ここで見られるよ。' },
  wordBuilder: { en: 'Word Builder', jp: 'ことばづくり' },
  wbHint: { en: 'Drag a sound into a block — or tap a block, then a sound.', jp: 'おとをブロックへドラッグ。または、ブロックをタップしてから おとをタップ。' },
  wbEmpty: { en: 'Put a sound in a block first.', jp: 'さきに おとを ブロックに入れてね。' },
  emptyBlock: { en: 'Empty block {n}', jp: 'からのブロック {n}' },
  blockWith: { en: 'Block {n}: {sound}. Tap to remove.', jp: 'ブロック {n}: {sound}。タップで消す。' },
  addBlock: { en: 'Add a block', jp: 'ブロックをふやす' },
  removeBlock: { en: 'Remove a block', jp: 'ブロックをへらす' },
  clearAll: { en: 'Clear', jp: 'ぜんぶ消す' },
  quieter: { en: 'Quieter', jp: 'ちいさく' },
  louder: { en: 'Louder', jp: 'おおきく' },
  play: { en: 'Play', jp: 'さいせい' },
  again: { en: 'Again', jp: 'もういちど' },
  tongueAgain: { en: 'Tongue again', jp: 'したを もういちど' },
  close: { en: 'Close', jp: 'とじる' },
  tapToPlay: { en: 'Tap to play', jp: 'タップして さいせい' },
  mouth: { en: 'Mouth', jp: 'くち' },
  tongue: { en: 'Tongue', jp: 'した' },
  footerNote: { en: 'Icons and host portrait are placeholders.', jp: 'アイコンとホストの絵は仮のものです。' },
  symbols: { en: 'Symbols', jp: '記号' },
} as const

export type StringKey = keyof typeof STRINGS

/** t('subtitle', 'en', { host: 'Brooke' }) → "Brooke will say it with you." */
export function t(key: StringKey, lang: Lang, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[key][lang]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Short "how to make it" line per sound, shown under the player. English comes from the manifest. */
export const ARTICULATION_JP: Record<string, string> = {
  th_voiceless: 'したの先を歯のあいだに。声は出さずに、息だけ。',
  th_voiced: 'おなじ形で、声を出してブーッ。',
  r: 'したをうしろに引いて、先はどこにもつけない。',
  k: 'したの奥を上にもち上げて、ポンとはなす。',
  ae: '口を大きくあけて、したは低く前に。',
  t: 'したの先で、上の歯のうしろをトンとたたく。',
}
