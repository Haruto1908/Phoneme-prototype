/**
 * Internationalisation. Every account has a primary language (stored on the user, see api/_lib/auth.ts); the UI,
 * tips, pronunciation feedback, spoken cheers, dates and errors all follow it. The words being taught (the
 * English sounds and example words) stay in English in every language.
 *
 * Adding a language: add a file in ./locales typed `Messages` (the build fails until every key is translated),
 * an entry in LANGUAGES, its ARTICULATION hints, its reasons in ./pronounce/reasons.ts, and the code in
 * api/_lib/lang.ts.
 */
import { en, type Messages, type StringKey } from './locales/en'
import { ja } from './locales/ja'
import { ko } from './locales/ko'
import { esMX } from './locales/es-MX'

export type { StringKey } from './locales/en'

/** BCP-47 tags, stored as-is on the account. */
export type Lang = 'en' | 'ja' | 'ko' | 'es-MX'

export interface LanguageInfo {
  code: Lang
  /** in its own language — what a speaker of it looks for in the picker */
  name: string
  /** compact label for the header button */
  short: string
  /** <html lang>, Intl formatting and speech synthesis */
  locale: string
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', name: 'English', short: 'EN', locale: 'en-US' },
  { code: 'ja', name: '日本語', short: '日本語', locale: 'ja-JP' },
  { code: 'ko', name: '한국어', short: '한국어', locale: 'ko-KR' },
  { code: 'es-MX', name: 'Español (México)', short: 'ES', locale: 'es-MX' },
]
export const DEFAULT_LANG: Lang = 'en'

const MESSAGES: Record<Lang, Messages> = { en, ja, ko, 'es-MX': esMX }

export const langInfo = (lang: Lang): LanguageInfo => LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

/**
 * Any user/URL/stored value → a supported language, or null. Accepts the old 'jp' code, any case, and bare 'es'
 * (Mexican Spanish is the Spanish we teach in).
 */
export function normLang(v: unknown): Lang | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'en' || s.startsWith('en-')) return 'en'
  if (s === 'ja' || s === 'jp' || s.startsWith('ja-')) return 'ja'
  if (s === 'ko' || s.startsWith('ko-')) return 'ko'
  if (s === 'es' || s.startsWith('es-')) return 'es-MX'
  return null
}

/** t('subtitle', 'en', { host: 'Brooke' }) → "Brooke will say it with you." Falls back to English per key. */
export function t(key: StringKey, lang: Lang, vars?: Record<string, string | number>): string {
  let s: string = MESSAGES[lang]?.[key] ?? en[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Message for a server error code, falling back to the generic one for codes this build does not know. */
export function errorText(code: string, lang: Lang): string {
  const key = `err.${code}` as StringKey
  return t(key in en ? key : 'err.server', lang)
}

/**
 * Short "how to make it" line per sound, shown under the player. English comes from the manifest (`english`);
 * the other languages are written here and reviewed by native teachers.
 */
const ARTICULATION: Record<Exclude<Lang, 'en'>, Record<string, string>> = {
  ja: {
    th_voiceless: 'したの先を歯で かるく はさんで、まわりから息を出す。声は出さない。',
    th_voiced: 'おなじように はさんで、声を出してブーッ。',
    r: 'くちを ひらいてから やさしく すぼめる。したは うしろに引いて、先はどこにもつけない（「ら」とちがう）。',
    k: 'したの奥を上あごにつけて、はなすと息がこすれて出る。',
    ae: '口を大きくあけて、したは低く前に。',
    t: 'したの先で、上の歯のうしろをトンとたたく。',
    l: 'したの先を 上の歯のうしろに つけたまま、声を出す。声は したの よこから出る（「ら」みたいに はじかない）。',
    d: 't と おなじ ばしょに したの先を つけて、のどを ふるわせながら はなす。「ドッ」。',
  },
  ko: {
    th_voiceless: '혀끝을 이 사이에 살짝 물고, 혀 둘레로 바람을 불어. 목소리는 안 내.',
    th_voiced: '똑같이 혀를 물고, 목소리를 내서 부르르 떨어 봐.',
    r: '입을 벌렸다가 살짝 오므려. 혀는 뒤로 당기고, 혀끝은 아무 데도 닿지 않아 (한국어 ㄹ과 달라).',
    k: '혀 뒤쪽을 입천장에 붙였다가 떼면, 바람이 긁히듯이 나와.',
    ae: '입을 크게 벌리고, 혀는 낮게 앞으로.',
    t: '혀끝으로 윗니 뒤쪽을 톡 쳐.',
    l: '혀끝을 윗니 뒤쪽에 붙인 채로 목소리를 내. 소리는 혀 양옆으로 나와 (ㄹ처럼 튕기지 않아).',
    d: 't와 같은 곳에 혀끝을 대고, 목을 떨면서 떼. "드".',
  },
  'es-MX': {
    th_voiceless: 'Pon la puntita de la lengua entre los dientes y sopla el aire alrededor. Sin voz.',
    th_voiced: 'Igual, con la lengua entre los dientes, pero ahora con voz: siente cómo vibra.',
    r: 'Abre la boca y luego ciérrala suavecito. La lengua va hacia atrás y la punta no toca nada (no es como la "r" del español).',
    k: 'La parte de atrás de la lengua toca el paladar y luego se suelta: el aire sale raspando.',
    ae: 'Abre bien la boca, con la lengua abajo y hacia adelante.',
    t: 'Con la punta de la lengua, toca detrás de los dientes de arriba: ¡tac!',
    l: 'La punta de la lengua se queda detrás de los dientes de arriba y la voz sale por los lados de la lengua.',
    d: 'Como la t, pero con voz: la punta de la lengua detrás de los dientes de arriba, siente la vibración y suelta.',
  },
}

export function articulation(id: string, lang: Lang, english: string): string {
  return lang === 'en' ? english : (ARTICULATION[lang][id] ?? english)
}
