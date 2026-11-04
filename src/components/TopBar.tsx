import type { Presenter } from '../types'
import { t, type Lang } from '../lib/i18n'
import { SpeakerIcon } from './icons'

interface TopBarProps {
  hostName: string
  /** Cartoon avatar next to the title. */
  avatar: string | null
  lang: Lang
  onLang: (lang: Lang) => void
  presenter: Presenter
  onPresenter: (p: Presenter) => void
  muted: boolean
  onMuted: (muted: boolean) => void
  practice: boolean
  onPractice: (on: boolean) => void
}

const PRESENTERS: Presenter[] = ['avatar', 'human', 'both']

/**
 * Composition 1: avatar + title on the left; the big Avatar / Human / Both toggle in the middle; language toggle,
 * sound button and Practice toggle on the right. Below lg the toggle drops to its own full-width row.
 */
export function TopBar({ hostName, avatar, lang, onLang, presenter, onPresenter, muted, onMuted, practice, onPractice }: TopBarProps) {
  return (
    <header className="no-select grid grid-cols-1 items-center gap-x-4 gap-y-3 rounded-[28px] bg-white/70 px-4 py-3 shadow-[0_10px_30px_-18px_rgba(43,53,69,0.45)] sm:px-5 md:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr]">
      {/* left: avatar + title */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mint-bg ring-4 ring-white sm:h-20 sm:w-20" role="img" aria-label={hostName}>
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 64 64" className="h-10 w-10 text-ink/40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true">
              <circle cx="32" cy="24" r="11" />
              <path d="M12 56c3-11 11-16 20-16s17 5 20 16" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold tracking-tight text-ink">{t('title', lang)}</h1>
          <p className="mt-0.5 truncate text-sm font-medium text-muted">{t('subtitle', lang, { host: hostName })}</p>
        </div>
      </div>

      {/* middle: Avatar / Human / Both — the main experiment switch, so it is big */}
      <div
        className="order-last col-span-full flex justify-center lg:order-none lg:col-span-1"
        role="radiogroup"
        aria-label={t('presenter', lang)}
      >
        <div className="flex rounded-full bg-ink/8 p-1.5 shadow-inner">
          {PRESENTERS.map((p) => {
            const on = presenter === p
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPresenter(p)}
                className={`h-14 min-w-[6.5rem] rounded-full px-5 text-lg font-extrabold transition-all sm:min-w-[7.5rem] sm:text-xl ${on ? 'bg-coral-ink text-white shadow-[0_6px_14px_-6px_rgba(184,69,45,0.7)] scale-105' : 'text-ink/60 hover:text-ink'}`}
              >
                {t(p, lang)}
              </button>
            )
          })}
        </div>
      </div>

      {/* right: EN/JP, sound, Practice */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:justify-end">
        <div className="flex rounded-full bg-white p-1 shadow-inner" role="group" aria-label={t('langLabel', lang)}>
          {(['en', 'jp'] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => onLang(l)}
              className={`h-10 min-w-12 rounded-full px-3 text-sm font-extrabold uppercase transition-colors ${lang === l ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
            >
              {l === 'en' ? 'EN' : 'JP'}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label={muted ? t('soundOff', lang) : t('soundOn', lang)}
          aria-pressed={!muted}
          title={muted ? t('soundOff', lang) : t('soundOn', lang)}
          onClick={() => onMuted(!muted)}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-[0_4px_0_0_rgba(43,53,69,0.12)] transition-transform active:translate-y-[2px] ${muted ? 'bg-coral-bg text-coral-ink' : 'bg-white text-ink'}`}
        >
          <SpeakerIcon level={muted ? 0 : 2} />
        </button>

        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white py-1.5 pl-3 pr-1.5 shadow-[0_4px_0_0_rgba(43,53,69,0.12)]" title={t('practiceHint', lang)}>
          <span className="text-sm font-extrabold text-ink">{t('practice', lang)}</span>
          <button
            type="button"
            role="switch"
            aria-checked={practice}
            aria-label={t('practice', lang)}
            onClick={() => onPractice(!practice)}
            className={`relative h-9 w-16 rounded-full transition-colors ${practice ? 'bg-mint-ink' : 'bg-ink/20'}`}
          >
            <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-[left] ${practice ? 'left-8' : 'left-1'}`} />
          </button>
        </label>
      </div>
    </header>
  )
}
