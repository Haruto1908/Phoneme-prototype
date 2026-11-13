import { useState, type ReactNode } from 'react'
import type { Presenter } from '../types'
import { t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import type { ModeCounts } from '../lib/log'
import type { Role } from '../lib/auth'
import { FaceIcon, HomeIcon, MicIcon, PeopleIcon, SpeakerIcon, UserIcon } from './icons'
import { AccountMenu, IconButton, LangToggle, ThemeToggle } from './controls'

interface TopBarProps {
  hostName: string
  /** Cartoon avatar next to the title. */
  avatar: string | null
  lang: Lang
  onLang: (lang: Lang) => void
  theme: Theme
  onTheme: (theme: Theme) => void
  presenter: Presenter
  onPresenter: (p: Presenter) => void
  muted: boolean
  onMuted: (muted: boolean) => void
  practice: boolean
  onPractice: (on: boolean) => void
  email: string
  role: Role
  /** How many times this account has used each mode (account menu + CSV). */
  usage: ModeCounts
  onLogout: () => void
  /** Managers only: leave the lesson for the dashboard. */
  onManager?: () => void
  /** Brooke's photo: start over with a fresh, empty dashboard. */
  onHome: () => void
}

const PRESENTERS: Presenter[] = ['avatar', 'human', 'both']
const PRESENTER_ICON: Record<Presenter, ReactNode> = {
  avatar: <FaceIcon className="h-5 w-5" />,
  human: <UserIcon className="h-5 w-5" />,
  both: <PeopleIcon className="h-5 w-5" />,
}

/**
 * Composition 1. Left: Brooke's photo (a Home button — tap it to start over) with the title and a friendly line.
 * Middle: "Who shows the sound?" — the Avatar / Human / Both switch, the main experiment control, with icons.
 * Right: one soft toolbar (language · sound · Practice · theme) and the account button.
 * Below xl (1280 px, e.g. iPad landscape) the mode switch drops to its own full-width row, so the title never truncates.
 */
export function TopBar({ hostName, avatar, lang, onLang, theme, onTheme, presenter, onPresenter, muted, onMuted, practice, onPractice, email, role, usage, onLogout, onManager, onHome }: TopBarProps) {
  const selected = PRESENTERS.indexOf(presenter)
  // bumps on every Home tap so the photo plays its little hop each time
  const [hop, setHop] = useState(0)
  return (
    <header className="no-select panel animate-rise relative z-20 grid grid-cols-1 items-center gap-x-4 gap-y-3 overflow-visible rounded-panel bg-[linear-gradient(110deg,var(--color-mint-bg)_0%,transparent_32%,transparent_68%,var(--color-sky-bg)_100%)] px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(0,1fr)_auto]">
      {/* brand: Brooke is the Home button */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setHop((n) => n + 1)
            onHome()
          }}
          aria-label={`${hostName}: ${t('home', lang)}`}
          title={t('home', lang)}
          className="group relative shrink-0 rounded-full outline-offset-4 transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-[-4deg] active:scale-95"
        >
          <span className="absolute -inset-1 rounded-full bg-[conic-gradient(from_120deg,var(--color-coral-ink),var(--color-sun-ink),var(--color-mint-ink),var(--color-sky-ink),var(--color-lavender-ink),var(--color-coral-ink))] opacity-80 blur-[1px] transition-opacity group-hover:opacity-100" aria-hidden="true" />
          <span key={hop} className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-mint-bg ring-[3px] ring-panel-strong sm:h-16 sm:w-16 ${hop ? 'animate-pop' : ''}`}>
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <svg viewBox="0 0 64 64" className="h-9 w-9 text-ink/40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                <circle cx="32" cy="24" r="11" />
                <path d="M12 56c3-11 11-16 20-16s17 5 20 16" />
              </svg>
            )}
          </span>
          {/* small home badge: tells adults the photo takes you back to the start */}
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-panel-strong text-coral-ink shadow-raise ring-1 ring-line transition-transform group-hover:scale-110" aria-hidden="true">
            <HomeIcon className="h-3.5 w-3.5" />
          </span>
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-ink sm:text-2xl md:text-xl lg:text-2xl">{t('title', lang)}</h1>
          <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-panel-strong/80 px-2.5 py-0.5 text-sm font-bold text-muted ring-1 ring-line">
            <span aria-hidden="true">📚</span>
            <span className="truncate">{t('lessonTag', lang)}</span>
          </p>
        </div>
        <div className="ml-auto shrink-0 md:hidden">
          <AccountMenu email={email} role={role} lang={lang} theme={theme} usage={usage} onTheme={onTheme} onLang={onLang} onLogout={onLogout} onManager={onManager} />
        </div>
      </div>

      {/* Avatar / Human / Both — the main experiment switch, with a sliding pill and icons */}
      <div className="order-last col-span-full flex flex-col items-center gap-1 xl:order-none xl:col-span-1 xl:justify-self-center">
        <span id="presenter-label" className="text-xs font-extrabold uppercase tracking-wider text-muted xl:sr-only">
          {t('presenter', lang)}
        </span>
        <div className="relative grid grid-cols-3 rounded-full bg-sunk p-1.5 ring-1 ring-line" role="radiogroup" aria-labelledby="presenter-label">
          <span
            aria-hidden="true"
            className="absolute inset-y-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-accent shadow-[0_6px_16px_-6px_var(--color-accent)] transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: `calc(0.375rem + ${selected} * (100% - 0.75rem) / 3)` }}
          />
          {PRESENTERS.map((p) => {
            const on = presenter === p
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPresenter(p)}
                className={`relative z-10 flex h-11 min-w-[5.5rem] items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 text-sm font-extrabold sm:gap-1.5 sm:px-3.5 transition-colors sm:min-w-[7.5rem] sm:text-lg xl:min-w-[6.5rem] xl:px-3 xl:text-base ${on ? 'text-on-accent' : 'text-muted hover:text-ink'}`}
              >
                <span className={`transition-transform ${on ? 'scale-110' : ''}`}>{PRESENTER_ICON[p]}</span>
                {t(p, lang)}
              </button>
            )
          })}
        </div>
      </div>

      {/* controls: one soft toolbar + the account button */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:flex-nowrap md:justify-end">
        <div className="flex items-center gap-1.5 rounded-full bg-sunk/70 p-1.5 ring-1 ring-line">
          <LangToggle lang={lang} onLang={onLang} />
          <IconButton label={muted ? t('soundOff', lang) : t('soundOn', lang)} pressed={!muted} onClick={() => onMuted(!muted)} className={muted ? 'text-accent' : ''}>
            <SpeakerIcon level={muted ? 0 : 2} className="h-6 w-6" />
          </IconButton>
          <button
            type="button"
            role="switch"
            aria-checked={practice}
            aria-label={t('practice', lang)}
            title={t('practiceHint', lang)}
            onClick={() => onPractice(!practice)}
            className="flex h-11 items-center gap-2 rounded-full bg-panel-strong py-1 pl-3 pr-1.5 shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[2px]"
          >
            <MicIcon className={`h-5 w-5 ${practice ? 'text-mint-ink' : 'text-muted'}`} />
            <span className="hidden text-sm font-extrabold text-ink xl:inline">{t('practice', lang)}</span>
            <span className={`relative h-7 w-12 rounded-full transition-colors ${practice ? 'bg-mint-ink' : 'bg-ink/20'}`} aria-hidden="true">
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${practice ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
          <ThemeToggle theme={theme} onTheme={onTheme} lang={lang} />
        </div>
        <div className="hidden md:block">
          <AccountMenu email={email} role={role} lang={lang} theme={theme} usage={usage} onTheme={onTheme} onLang={onLang} onLogout={onLogout} onManager={onManager} />
        </div>
      </div>
    </header>
  )
}
