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

/** Feedback lines in every UI language ({host} = the model speaker). Children's register: short and warm. */
type R = Record<Lang, string>
const REASONS = {
  quiet: {
    en: 'We could hardly hear you — come a little closer to the microphone.',
    ja: '声が小さくて よく聞こえなかったよ。マイクに もうすこし近づいてね。',
    ko: '목소리가 작아서 잘 안 들렸어. 마이크에 조금 더 가까이 와 봐.',
    'es-MX': 'Casi no te escuchamos. Acércate un poquito más al micrófono.',
  },
  short: {
    en: 'That was very short — say the sound a little longer.',
    ja: 'とても みじかかったよ。もうすこし長く 言ってみてね。',
    ko: '너무 짧았어. 소리를 조금 더 길게 말해 봐.',
    'es-MX': 'Fue muy cortito. Di el sonido un poco más largo.',
  },
  addVoice: {
    en: 'Add your voice — feel the buzz in your throat.',
    ja: '声を出してみよう。のどが ブルブルするよ。',
    ko: '목소리를 내 봐. 목이 부르르 떨리는 걸 느껴 봐.',
    'es-MX': 'Ponle voz: siente cómo vibra tu garganta.',
  },
  noVoice: {
    en: 'This sound is only air — no voice, just a whisper of breath.',
    ja: 'このおとは 息だけ。声は出さずに ふーっと。',
    ko: '이 소리는 바람만 나와. 목소리 없이 후— 하고 불어.',
    'es-MX': 'Este sonido es solo aire, sin voz: como un soplido.',
  },
  long: {
    en: 'A bit long — try one short, clean sound.',
    ja: 'すこし長いかな。みじかく はっきり 1回だけ。',
    ko: '조금 길었어. 짧고 또렷하게 한 번만 해 봐.',
    'es-MX': 'Un poco largo. Intenta un solo sonido, corto y claro.',
  },
  hold: {
    en: 'Hold the sound a little longer, like {host}.',
    ja: '{host}みたいに もうすこし長く のばしてみよう。',
    ko: '{host}처럼 소리를 조금 더 길게 이어 봐.',
    'es-MX': 'Alarga el sonido un poquito más, como {host}.',
  },
  sharpTh: {
    en: 'That sounds sharper, like "s" — put the tongue tip between your teeth.',
    ja: '「す」みたいに するどいおとだよ。したの先を 歯のあいだに 入れてね。',
    ko: '「ㅅ」처럼 날카롭게 들려. 혀끝을 이 사이에 넣어 봐.',
    'es-MX': 'Suena más como una "s". Pon la punta de la lengua entre los dientes.',
  },
  great: {
    en: 'Great — that sounds just like {host}!',
    ja: 'すごい！ {host}と そっくりだよ！',
    ko: '최고야! {host}이랑 똑같이 들려!',
    'es-MX': '¡Excelente! ¡Suena igualito a {host}!',
  },
  close: {
    en: 'Close! Watch the mouth once more and try again.',
    ja: 'おしい！ もういちど 口を見て やってみよう。',
    ko: '거의 다 됐어! 입을 한 번 더 보고 다시 해 봐.',
    'es-MX': '¡Casi! Mira la boca otra vez e inténtalo de nuevo.',
  },
  getting: {
    en: 'Getting there — the sound is a little different. Listen and try again.',
    ja: 'いいかんじ。でも おとが すこし ちがうよ。聞いて もういちど。',
    ko: '좋아지고 있어. 그런데 소리가 조금 달라. 듣고 다시 해 봐.',
    'es-MX': 'Vas bien, pero el sonido es un poco distinto. Escucha y vuelve a intentarlo.',
  },
  different: {
    en: 'That is a different sound — watch the side view and try again.',
    ja: 'ちがうおとに なったよ。横から見た動きを見て もういちど。',
    ko: '다른 소리가 났어. 옆에서 본 움직임을 보고 다시 해 봐.',
    'es-MX': 'Ese es otro sonido. Mira la vista de lado e inténtalo otra vez.',
  },
} satisfies Record<string, R>

export type ReasonKey = keyof typeof REASONS

/**
 * Pick the single most useful remark about the attempt. Recording problems first (quiet, short), then the
 * articulatory checks, then how the attempt ranked against the other sounds. Stored with every attempt so an AI
 * can later phrase it as spoken feedback.
 */
export function reasonKey(c: Comparison, meta: SoundMeta): ReasonKey {
  const { user, ref, rank, score } = c
  if (user.peakDb < -30) return 'quiet'
  if (user.duration < 0.08) return 'short'
  if (meta.voiced && ref.voiced > 0.4 && user.voiced < 0.2) return 'addVoice'
  if (!meta.voiced && ref.voiced < 0.3 && user.voiced > 0.6) return 'noVoice'
  if (user.duration > 3 * ref.duration + 0.4) return 'long'
  if (meta.held && user.duration < 0.4 * ref.duration) return 'hold'
  if (meta.id === 'th_voiceless' && user.centroid > 5000) return 'sharpTh'
  if (meta.id === 'th_voiced' && user.centroid > 1800 && user.voiced > 0.4) return 'sharpTh'
  if (rank === 1 && score >= 75) return 'great'
  if (rank === 1) return 'close'
  if (rank === 2) return 'getting'
  return 'different'
}

export function reasonText(key: ReasonKey, lang: Lang, host: string): string {
  return REASONS[key][lang].replaceAll('{host}', host)
}
