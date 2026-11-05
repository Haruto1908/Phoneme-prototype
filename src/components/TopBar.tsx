import type { Presenter } from '../types'
import { t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import type { ModeCounts } from '../lib/log'
import { SpeakerIcon } from './icons'
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
  /** How many times this account has used each mode (account menu + CSV). */
  usage: ModeCounts
  onLogout: () => void
}

const PRESENTERS: Presenter[] = ['avatar', 'human', 'both']

/**
 * Composition 1: brand (avatar + title) on the left; the Avatar / Human / Both control in the middle; on the
 * right the language switch, sound, Practice, theme toggle and the account menu. Below lg the mode control
 * drops to its own full-width row.
 */
export function TopBar({ hostName, avatar, lang, onLang, theme, onTheme, presenter, onPresenter, muted, onMuted, practice, onPractice, email, usage, onLogout }: TopBarProps) {
  const selected = PRESENTERS.indexOf(presenter)
  return (
    <header className="no-select panel animate-rise relative z-20 grid grid-cols-1 items-center gap-x-4 gap-y-3 rounded-panel px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      {/* brand */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <span className="absolute -inset-1 rounded-full bg-[conic-gradient(from_120deg,var(--color-coral-ink),var(--color-sun-ink),var(--color-mint-ink),var(--color-sky-ink),var(--color-lavender-ink),var(--color-coral-ink))] opacity-80 blur-[1px]" aria-hidden="true" />
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-mint-bg ring-[3px] ring-panel-strong sm:h-16 sm:w-16" role="img" aria-label={hostName}>
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <svg viewBox="0 0 64 64" className="h-9 w-9 text-ink/40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
                <circle cx="32" cy="24" r="11" />
                <path d="M12 56c3-11 11-16 20-16s17 5 20 16" />
              </svg>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-black tracking-tight text-ink sm:text-2xl">{t('title', lang)}</h1>
          <p className="mt-0.5 truncate text-sm font-semibold text-muted">{t('subtitle', lang, { host: hostName })}</p>
        </div>
      </div>

      {/* Avatar / Human / Both — the main experiment switch, with a sliding pill */}
      <div className="order-last col-span-full flex justify-center lg:order-none lg:col-span-1" role="radiogroup" aria-label={t('presenter', lang)}>
        <div className="relative grid grid-cols-3 rounded-full bg-sunk p-1.5 ring-1 ring-line">
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
                className={`relative z-10 h-12 min-w-[6.25rem] rounded-full px-4 text-base font-extrabold transition-colors sm:min-w-[7.25rem] sm:text-lg ${on ? 'text-on-accent' : 'text-muted hover:text-ink'}`}
              >
                {t(p, lang)}
              </button>
            )
          })}
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 lg:flex-nowrap">
        <LangToggle lang={lang} onLang={onLang} />

        <IconButton label={muted ? t('soundOff', lang) : t('soundOn', lang)} pressed={!muted} onClick={() => onMuted(!muted)} className={muted ? 'text-accent' : ''}>
          <SpeakerIcon level={muted ? 0 : 2} className="h-6 w-6" />
        </IconButton>

        <label className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-panel-strong py-1 pl-3.5 pr-1.5 shadow-raise ring-1 ring-line" title={t('practiceHint', lang)}>
          <span className="text-sm font-extrabold text-ink">{t('practice', lang)}</span>
          <button
            type="button"
            role="switch"
            aria-checked={practice}
            aria-label={t('practice', lang)}
            onClick={() => onPractice(!practice)}
            className={`relative h-8 w-14 rounded-full transition-colors ${practice ? 'bg-mint-ink' : 'bg-ink/20'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ${practice ? 'left-7' : 'left-1'}`} />
          </button>
        </label>

        <ThemeToggle theme={theme} onTheme={onTheme} lang={lang} />
        <AccountMenu email={email} lang={lang} theme={theme} usage={usage} onTheme={onTheme} onLang={onLang} onLogout={onLogout} />
      </div>
    </header>
  )
}
