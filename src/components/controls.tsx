import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LANGUAGES, langInfo, t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import { CSV_URL, type ModeCounts } from '../lib/log'
import type { Role } from '../lib/auth'
import type { Presenter } from '../types'
import { ChartIcon, CheckIcon, ChevronDownIcon, DownloadIcon, GlobeIcon, LogoutIcon, MoonIcon, SunIcon } from './icons'

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

/** Section heading with a small tinted icon badge, so every panel has the same "signpost". */
export function SectionTitle({ icon, tone, children }: { icon: ReactNode; tone: 'mint' | 'sky' | 'sun' | 'coral' | 'lavender'; children: ReactNode }) {
  const tones = {
    mint: 'bg-mint-bg text-mint-ink',
    sky: 'bg-sky-bg text-sky-ink',
    sun: 'bg-sun-bg text-sun-ink',
    coral: 'bg-coral-bg text-coral-ink',
    lavender: 'bg-lavender-bg text-lavender-ink',
  }
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-ink">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 dark:ring-white/10 ${tones[tone]}`} aria-hidden="true">
        {icon}
      </span>
      {children}
    </h2>
  )
}

/**
 * Language picker: a globe button with the current language that opens a short menu listing every language in
 * its own script (so a Korean parent finds 한국어 even when the page is in English). Choosing one while signed in
 * changes the account's primary language (Root.tsx).
 */
export function LangPicker({ lang, onLang, size = 'md', align = 'right' }: { lang: Lang; onLang: (l: Lang) => void; size?: 'sm' | 'md'; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useDismiss(box, open, () => setOpen(false))
  const cur = langInfo(lang)
  return (
    <div ref={box} className="no-select relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('chooseLanguage', lang)}: ${cur.name}`}
        title={t('chooseLanguage', lang)}
        onClick={() => setOpen((o) => !o)}
        className={`flex ${size === 'sm' ? 'h-9 text-xs' : 'h-11 text-sm'} items-center gap-1.5 rounded-full bg-panel-strong pl-2.5 pr-2 font-extrabold text-ink shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[2px] ${open ? 'ring-2 ring-accent/50' : ''}`}
      >
        <GlobeIcon className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} text-sky-ink`} />
        <span lang={cur.locale} className="whitespace-nowrap">
          {cur.short}
        </span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="menu"
          aria-label={t('chooseLanguage', lang)}
          className={`animate-pop absolute top-full z-50 mt-2 min-w-[12.5rem] rounded-2xl bg-panel-strong p-1.5 shadow-float ring-1 ring-line ${align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}`}
        >
          {LANGUAGES.map((l) => {
            const on = l.code === lang
            return (
              <li key={l.code} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  lang={l.locale}
                  onClick={() => {
                    setOpen(false)
                    if (!on) onLang(l.code)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold transition-colors ${on ? 'bg-sky-bg text-sky-ink' : 'text-ink hover:bg-sunk'}`}
                >
                  {l.name}
                  {on && <CheckIcon className="h-4 w-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Close a popover on a tap outside it or on Escape. */
function useDismiss(box: { current: HTMLElement | null }, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [box, open, close])
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
  role: Role
  lang: Lang
  theme: Theme
  /** times each presenter mode was used by this account; null hides the block (manager dashboard) */
  usage: ModeCounts | null
  onTheme: (t: Theme) => void
  onLang: (l: Lang) => void
  onLogout: () => void
  /** Offered to managers only: open the dashboard over every student. */
  onManager?: () => void
}

const MODE_TONES: Record<Presenter, string> = {
  avatar: 'bg-coral-bg text-coral-ink',
  human: 'bg-sky-bg text-sky-ink',
  both: 'bg-lavender-bg text-lavender-ink',
}

/** Account button in the top bar: opens a sheet with the email, language, theme, mode usage + CSV, and Log out. */
export function AccountMenu({ email, role, lang, theme, usage, onTheme, onLang, onLogout, onManager }: AccountMenuProps) {
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
              {role === 'manager' ? (
                <p className="mt-0.5 inline-flex rounded-full bg-lavender-bg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-lavender-ink">{t('manager', lang)}</p>
              ) : (
                <p className="text-xs font-medium text-muted">{t('accountHint', lang)}</p>
              )}
            </div>
          </div>

          <div className="my-4 h-px bg-line" />

          <Row label={t('primaryLanguage', lang)}>
            <LangPicker lang={lang} onLang={onLang} size="sm" />
          </Row>
          <p className="-mt-0.5 mb-1 text-xs font-medium text-muted">{t('primaryLanguageHint', lang)}</p>
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

          <div className="my-4 h-px bg-line" />

          {/* session log: how often each mode was used, and the CSV export */}
          {usage && (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-muted">{t('activity', lang)}</span>
                <span className="text-xs font-semibold text-muted">{t('activityHint', lang)}</span>
              </div>
              <ul className="mt-2 grid grid-cols-3 gap-2" aria-label={t('activity', lang)}>
                {(['avatar', 'human', 'both'] as const).map((m) => (
                  <li key={m} className={`rounded-2xl px-2 py-2 text-center ring-1 ring-black/5 dark:ring-white/10 ${MODE_TONES[m]}`}>
                    <span className="block text-2xl font-black leading-none tabular-nums">{usage[m]}</span>
                    <span className="mt-1 block text-[11px] font-extrabold uppercase tracking-wide opacity-80">{t(m, lang)}</span>
                  </li>
                ))}
              </ul>
              <a
                href={CSV_URL}
                download
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-panel-strong text-sm font-extrabold text-ink shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
              >
                <DownloadIcon className="h-5 w-5" />
                {t('downloadCsv', lang)}
              </a>
            </>
          )}

          {onManager && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onManager()
              }}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-lavender-bg text-sm font-extrabold text-lavender-ink shadow-raise ring-1 ring-black/5 transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none dark:ring-white/10"
            >
              <ChartIcon className="h-5 w-5" />
              {t('managerOpen', lang)}
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-base font-extrabold text-canvas shadow-raise transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
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
