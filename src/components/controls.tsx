import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import { LogoutIcon, MoonIcon, SunIcon } from './icons'

/** Round, raised icon button used across the top bar. */
export function IconButton({ label, pressed, onClick, className, children }: { label: string; pressed?: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-panel-strong text-ink shadow-raise ring-1 ring-line transition-[transform,background-color] hover:-translate-y-px active:translate-y-[2px] active:shadow-none ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** EN / JP segmented control. */
export function LangToggle({ lang, onLang, size = 'md' }: { lang: Lang; onLang: (l: Lang) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-9 min-w-11 text-xs' : 'h-9 min-w-12 text-sm'
  return (
    <div className="no-select flex rounded-full bg-sunk p-1 ring-1 ring-line" role="group" aria-label={t('langLabel', lang)}>
      {(['en', 'jp'] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          onClick={() => onLang(l)}
          className={`${h} rounded-full px-3 font-extrabold uppercase tracking-wide transition-all ${lang === l ? 'bg-panel-strong text-ink shadow-raise' : 'text-muted hover:text-ink'}`}
        >
          {l === 'en' ? 'EN' : 'JP'}
        </button>
      ))}
    </div>
  )
}

/** Sun / moon switch; the icon swaps with a small turn. */
export function ThemeToggle({ theme, onTheme, lang }: { theme: Theme; onTheme: (t: Theme) => void; lang: Lang }) {
  const dark = theme === 'dark'
  return (
    <IconButton label={dark ? t('themeLight', lang) : t('themeDark', lang)} pressed={dark} onClick={() => onTheme(dark ? 'light' : 'dark')} className="overflow-hidden">
      <span className={`flex items-center justify-center transition-transform duration-500 ${dark ? 'rotate-[360deg]' : ''}`}>
        {dark ? <MoonIcon className="h-6 w-6 text-sun-ink" /> : <SunIcon className="h-6 w-6 text-sun-ink" />}
      </span>
    </IconButton>
  )
}

/** Gradient circle with the first letter of the email — the user's mark. */
export function Avatar({ email, className }: { email: string; className?: string }) {
  const letter = email.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-lavender-ink),var(--color-sky-ink))] font-black text-white shadow-raise ring-2 ring-panel-strong ${className ?? 'h-11 w-11 text-lg'}`}
      aria-hidden="true"
    >
      {letter}
    </span>
  )
}

interface AccountMenuProps {
  email: string
  lang: Lang
  theme: Theme
  onTheme: (t: Theme) => void
  onLang: (l: Lang) => void
  onLogout: () => void
}

/** Account button in the top bar: opens a small sheet with the email, language, theme and Log out. */
export function AccountMenu({ email, lang, theme, onTheme, onLang, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={t('account', lang)}
        title={email}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:-translate-y-px active:translate-y-[2px] ${open ? 'ring-4 ring-accent/30' : ''}`}
      >
        <Avatar email={email} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('account', lang)}
          className="animate-pop absolute right-0 top-full z-40 mt-3 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-[24px] bg-panel-strong p-4 text-left shadow-float ring-1 ring-line"
        >
          <div className="flex items-center gap-3">
            <Avatar email={email} className="h-12 w-12 text-xl" />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-ink" title={email}>
                {email}
              </p>
              <p className="text-xs font-medium text-muted">{t('accountHint', lang)}</p>
            </div>
          </div>

          <div className="my-4 h-px bg-line" />

          <Row label={t('langLabel', lang)}>
            <LangToggle lang={lang} onLang={onLang} size="sm" />
          </Row>
          <Row label={t('theme', lang)}>
            <div className="no-select flex rounded-full bg-sunk p-1 ring-1 ring-line" role="group" aria-label={t('theme', lang)}>
              {(['light', 'dark'] as const).map((th) => (
                <button
                  key={th}
                  type="button"
                  aria-pressed={theme === th}
                  onClick={() => onTheme(th)}
                  className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-extrabold transition-all ${theme === th ? 'bg-panel-strong text-ink shadow-raise' : 'text-muted hover:text-ink'}`}
                >
                  {th === 'light' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                  {t(th, lang)}
                </button>
              ))}
            </div>
          </Row>

          <button
            type="button"
            onClick={onLogout}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-extrabold text-canvas shadow-raise transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
          >
            <LogoutIcon className="h-5 w-5" />
            {t('signOut', lang)}
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-bold text-muted">{label}</span>
      {children}
    </div>
  )
}
