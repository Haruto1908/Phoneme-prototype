import type { Lang } from '../i18n'
import type { Comparison } from './dsp'

/** What the reason logic needs to know about the target sound. */
export interface SoundMeta {
  id: string
  /** Really voiced (the manifest only flags ð, to tell the two th cards apart). */
  voiced: boolean
  /** Sounds that are held (fricatives, vowels, approximants) vs. stops that are over in an instant. */
  held: boolean
}

export const SOUND_META: Record<string, SoundMeta> = {
  th_voiceless: { id: 'th_voiceless', voiced: false, held: true },
  th_voiced: { id: 'th_voiced', voiced: true, held: true },
  r: { id: 'r', voiced: true, held: true },
  k: { id: 'k', voiced: false, held: false },
  ae: { id: 'ae', voiced: true, held: true },
  t: { id: 't', voiced: false, held: false },
}

type R = { en: string; jp: string }
const REASONS = {
  quiet: { en: 'We could hardly hear you — come a little closer to the microphone.', jp: '声が小さくて よく聞こえなかったよ。マイクに もうすこし近づいてね。' },
  short: { en: 'That was very short — say the sound a little longer.', jp: 'とても みじかかったよ。もうすこし長く 言ってみてね。' },
  addVoice: { en: 'Add your voice — feel the buzz in your throat.', jp: '声を出してみよう。のどが ブルブルするよ。' },
  noVoice: { en: 'This sound is only air — no voice, just a whisper of breath.', jp: 'このおとは 息だけ。声は出さずに ふーっと。' },
  long: { en: 'A bit long — try one short, clean sound.', jp: 'すこし長いかな。みじかく はっきり 1回だけ。' },
  hold: { en: 'Hold the sound a little longer, like {host}.', jp: '{host}みたいに もうすこし長く のばしてみよう。' },
  sharpTh: { en: 'That sounds sharper, like "s" — put the tongue tip between your teeth.', jp: '「す」みたいに するどいおとだよ。したの先を 歯のあいだに 入れてね。' },
  great: { en: 'Great — that sounds just like {host}!', jp: 'すごい！ {host}と そっくりだよ！' },
  close: { en: 'Close! Watch the mouth once more and try again.', jp: 'おしい！ もういちど 口を見て やってみよう。' },
  getting: { en: 'Getting there — the sound is a little different. Listen and try again.', jp: 'いいかんじ。でも おとが すこし ちがうよ。聞いて もういちど。' },
  different: { en: 'That is a different sound — watch the side view and try again.', jp: 'ちがうおとに なったよ。横から見た動きを見て もういちど。' },
} satisfies Record<string, R>

export type ReasonKey = keyof typeof REASONS

/** Pick the single most useful remark about the attempt. */
export function reasonKey(c: Comparison, meta: SoundMeta): ReasonKey {
  const { user, ref, score } = c
  if (user.peakDb < -30) return 'quiet'
  if (user.duration < 0.08) return 'short'
  if (meta.voiced && ref.voiced > 0.4 && user.voiced < 0.2) return 'addVoice'
  if (!meta.voiced && ref.voiced < 0.3 && user.voiced > 0.6) return 'noVoice'
  if (user.duration > 3 * ref.duration + 0.4) return 'long'
  if (meta.held && user.duration < 0.4 * ref.duration) return 'hold'
  if (meta.id === 'th_voiceless' && user.centroid > 5000) return 'sharpTh'
  if (meta.id === 'th_voiced' && user.centroid > 1800 && user.voiced > 0.4) return 'sharpTh'
  if (score >= 85) return 'great'
  if (score >= 65) return 'close'
  if (score >= 40) return 'getting'
  return 'different'
}

export function reasonText(key: ReasonKey, lang: Lang, host: string): string {
  return REASONS[key][lang].replaceAll('{host}', host)
}
