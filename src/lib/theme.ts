/** Light / dark theme: a `.dark` class on <html> flips the CSS tokens in index.css. Saved per device. */

export type Theme = 'light' | 'dark'

const THEME_KEY = 'soundchart.theme'
const META_COLOR: Record<Theme, string> = { light: '#eef4ff', dark: '#0f172a' }

/** Saved theme, else the OS preference. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode */
  }
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* private mode */
  }
}
