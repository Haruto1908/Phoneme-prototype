import { DEFAULT_LANG, normLang, type Lang } from './i18n'

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

/**
 * Language before anyone is signed in (sign-in page): ?lang= wins, then the language last used on this device,
 * then the browser's own language. Once signed in, the account's primary language takes over (Root.tsx).
 */
export function readLang(): Lang {
  return normLang(new URLSearchParams(window.location.search).get('lang')) ?? normLang(read().lang) ?? normLang(navigator.language) ?? DEFAULT_LANG
}

export function writeLang(lang: Lang): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...read(), lang }))
  } catch {
    /* private mode */
  }
}
