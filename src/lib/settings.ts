import type { Lang } from './i18n'

/** localStorage key for the app settings (lang, presenter, muted, volume, practice). */
export const SETTINGS_KEY = 'soundchart.settings'

function read(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Language before the app itself is mounted (sign-in page): ?lang= wins, then the saved setting. */
export function readLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang')
  if (q === 'jp' || q === 'en') return q
  return read().lang === 'jp' ? 'jp' : 'en'
}

export function writeLang(lang: Lang): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...read(), lang }))
  } catch {
    /* private mode */
  }
}
