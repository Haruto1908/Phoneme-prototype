/**
 * Supported primary languages (BCP-47), mirrored from src/lib/i18n.ts — the API must not import browser code.
 * Each account stores one of these as `lang`; every system message the user sees follows it.
 */
export const LANGS = ['en', 'ja', 'ko', 'es-MX'] as const
export type Lang = (typeof LANGS)[number]

/** Any request value → a supported language, or null. Accepts the old 'jp' code, any case, and bare 'es'. */
export function normLang(v: unknown): Lang | null {
  const s = String(v ?? '').trim().toLowerCase()
  if (s === 'en' || s.startsWith('en-')) return 'en'
  if (s === 'ja' || s === 'jp' || s.startsWith('ja-')) return 'ja'
  if (s === 'ko' || s.startsWith('ko-')) return 'ko'
  if (s === 'es' || s.startsWith('es-')) return 'es-MX'
  return null
}
