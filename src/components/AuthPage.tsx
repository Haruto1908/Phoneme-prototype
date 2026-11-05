import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, auth, type User } from '../lib/auth'
import { t, type Lang, type StringKey } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import type { Sound } from '../types'
import { cardLabel } from '../lib/plan'
import { palette } from './palette'
import { LangToggle, ThemeToggle } from './controls'
import { CheckIcon, EyeIcon, LockIcon, MailIcon, MicIcon, MouthIcon, TongueIcon } from './icons'

interface AuthPageProps {
  lang: Lang
  onLang: (lang: Lang) => void
  theme: Theme
  onTheme: (theme: Theme) => void
  host: string
  avatar: string | null
  /** The chart's sounds, for the floating chips on the hero (empty until the manifest loads). */
  sounds: Sound[]
  onSignedIn: (user: User) => void
}

type View = 'login' | 'signup'

const ERR_KEYS: Record<string, true> = {
  'err.invalid_email': true,
  'err.weak_password': true,
  'err.email_taken': true,
  'err.bad_credentials': true,
  'err.config': true,
  'err.server': true,
  'err.network': true,
}
function errorKey(e: unknown): StringKey {
  const code = e instanceof ApiError ? e.code : 'server'
  const key = `err.${code}` as StringKey
  return key in ERR_KEYS ? key : 'err.server'
}

/** Where the phoneme chips float on the hero (percent of the panel) and how they lean. */
const CHIP_SPOTS = [
  { left: 6, top: 44, tilt: -8, delay: 0 },
  { left: 58, top: 36, tilt: 6, delay: 0.8 },
  { left: 30, top: 54, tilt: -3, delay: 1.6 },
  { left: 72, top: 58, tilt: 9, delay: 0.4 },
  { left: 14, top: 68, tilt: 5, delay: 2.2 },
  { left: 50, top: 72, tilt: -6, delay: 1.2 },
]

/**
 * Sign-in gate shown before the sound chart. Left: what the product does, with the sounds floating around the
 * host. Right: log in or sign up with an email and password.
 */
export function AuthPage({ lang, onLang, theme, onTheme, host, avatar, sounds, onSignedIn }: AuthPageProps) {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      onSignedIn(view === 'login' ? await auth.login(email, password) : await auth.signup(email, password))
    } catch (err) {
      setError(errorKey(err))
      setBusy(false)
    }
  }

  function switchView(v: View) {
    setView(v)
    setError(null)
  }

  const features: Array<{ key: StringKey; hint: StringKey; icon: typeof MouthIcon; tone: string }> = [
    { key: 'feature1', hint: 'feature1Hint', icon: MouthIcon, tone: 'bg-coral-bg text-coral-ink' },
    { key: 'feature2', hint: 'feature2Hint', icon: TongueIcon, tone: 'bg-lavender-bg text-lavender-ink' },
    { key: 'feature3', hint: 'feature3Hint', icon: MicIcon, tone: 'bg-mint-bg text-mint-ink' },
  ]

  return (
    <main className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 gap-4 p-3 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
      {/* hero */}
      <section className="panel animate-rise relative hidden overflow-hidden rounded-[36px] p-8 lg:flex lg:flex-col lg:justify-between xl:p-10" aria-label={t('heroEyebrow', lang)}>
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="animate-drift absolute -left-20 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,var(--color-lavender-bg),transparent_65%)] opacity-90" />
          <span className="animate-drift absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,var(--color-mint-bg),transparent_65%)] opacity-90 [animation-delay:-9s]" />
          <span className="absolute right-10 top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,var(--color-sun-bg),transparent_65%)]" />
        </div>

        <div className="relative flex items-center gap-3">
          <Brand avatar={avatar} host={host} lang={lang} />
        </div>

        <div className="relative my-10 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-muted">{t('heroEyebrow', lang)}</p>
          <h2 className="mt-3 max-w-xl text-5xl font-black leading-[1.02] tracking-tight text-ink xl:text-6xl">{t('heroTitle', lang, { host })}</h2>
          <p className="mt-5 max-w-lg text-lg font-semibold leading-relaxed text-muted">{t('heroSub', lang)}</p>

          {/* the sounds, floating */}
          <div className="relative mt-10 h-56" aria-hidden="true">
            {sounds.slice(0, CHIP_SPOTS.length).map((s, i) => {
              const spot = CHIP_SPOTS[i]
              const c = palette[s.color]
              return (
                <span
                  key={s.id}
                  className={`animate-float absolute flex items-center gap-2 rounded-2xl px-4 py-2.5 font-ipa text-2xl font-bold shadow-tile ring-1 ring-white/50 dark:ring-white/10 ${c.bg} ${c.ink}`}
                  style={{ left: `${spot.left}%`, top: `${spot.top}%`, ['--tilt' as string]: `${spot.tilt}deg`, ['--edge' as string]: c.edgeVar, animationDelay: `${spot.delay}s` }}
                >
                  {cardLabel(s)}
                  <span className="font-sans text-xs font-extrabold uppercase tracking-wider opacity-70">{s.exampleWord}</span>
                </span>
              )
            })}
          </div>
        </div>

        <ul className="relative grid grid-cols-3 gap-3">
          {features.map((f) => (
            <li key={f.key} className="flex items-start gap-3 rounded-2xl bg-panel-strong/70 p-3 ring-1 ring-line">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.tone}`}>
                <f.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold leading-tight text-ink">{t(f.key, lang)}</span>
                <span className="mt-0.5 block text-xs font-semibold leading-tight text-muted">{t(f.hint, lang)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* form */}
      <section className="flex min-w-0 flex-col">
        <div className="no-select flex items-center justify-between gap-3 px-1 lg:justify-end">
          <div className="min-w-0 flex-1 lg:hidden">
            <Brand avatar={avatar} host={host} lang={lang} compact />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LangToggle lang={lang} onLang={onLang} />
            <ThemeToggle theme={theme} onTheme={onTheme} lang={lang} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-6">
          <form onSubmit={submit} className="panel animate-rise w-full max-w-md rounded-[32px] p-6 sm:p-8 [animation-delay:80ms]" aria-busy={busy}>
            <div className="no-select grid grid-cols-2 rounded-full bg-sunk p-1.5 ring-1 ring-line" role="tablist" aria-label={t('account', lang)}>
              {(['login', 'signup'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => switchView(v)}
                  className={`h-12 rounded-full text-base font-extrabold transition-all ${view === v ? 'bg-panel-strong text-ink shadow-raise' : 'text-muted hover:text-ink'}`}
                >
                  {t(v === 'login' ? 'signIn' : 'signUp', lang)}
                </button>
              ))}
            </div>

            <div className="mt-7">
              <h2 className="text-3xl font-black tracking-tight text-ink">{t(view === 'login' ? 'welcomeBack' : 'createAccount', lang)}</h2>
              <p className="mt-1.5 text-sm font-semibold text-muted">{t(view === 'login' ? 'welcomeBackHint' : 'createAccountHint', lang)}</p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <Field label={t('email', lang)} icon={<MailIcon className="h-5 w-5" />}>
                <input
                  className={INPUT}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder', lang)}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Field
                label={t('password', lang)}
                icon={<LockIcon className="h-5 w-5" />}
                hint={view === 'signup' ? t('passwordHint', lang) : undefined}
                trailing={
                  <button
                    type="button"
                    aria-label={showPw ? t('hidePassword', lang) : t('showPassword', lang)}
                    aria-pressed={showPw}
                    onClick={() => setShowPw((s) => !s)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunk hover:text-ink"
                  >
                    <EyeIcon off={showPw} className="h-5 w-5" />
                  </button>
                }
              >
                <input
                  className={INPUT}
                  type={showPw ? 'text' : 'password'}
                  autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                  minLength={view === 'signup' ? 8 : undefined}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
            </div>

            {error && (
              <p role="alert" className="animate-pop mt-4 rounded-2xl bg-coral-bg px-4 py-3 text-sm font-bold text-coral-ink ring-1 ring-coral-edge/60">
                {t(error, lang)}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-lg font-extrabold text-on-accent shadow-[0_8px_0_0_color-mix(in_oklab,var(--color-accent)_70%,black),0_18px_30px_-14px_var(--color-accent)] transition-[transform,box-shadow,background-color] hover:bg-accent-hover active:translate-y-[4px] active:shadow-[0_2px_0_0_color-mix(in_oklab,var(--color-accent)_70%,black)] disabled:translate-y-0 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-on-accent/30 border-t-on-accent" aria-hidden="true" />
                  {t('working', lang)}
                </>
              ) : (
                <>
                  {view === 'signup' && <CheckIcon className="h-6 w-6" />}
                  {t(view === 'login' ? 'signIn' : 'signUp', lang)}
                </>
              )}
            </button>

            <p className="no-select mt-5 text-center text-sm font-semibold text-muted">
              {t(view === 'login' ? 'noAccount' : 'haveAccount', lang)}{' '}
              <button type="button" onClick={() => switchView(view === 'login' ? 'signup' : 'login')} className="font-extrabold text-accent underline-offset-4 hover:underline">
                {t(view === 'login' ? 'signUp' : 'signIn', lang)}
              </button>
            </p>
          </form>
        </div>

        <p className="no-select px-1 text-center text-xs font-semibold text-muted lg:text-right">{t('authFootnote', lang)}</p>
      </section>
    </main>
  )
}

const INPUT = 'h-14 w-full min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none placeholder:text-muted/60'

function Field({ label, icon, hint, trailing, children }: { label: string; icon: ReactNode; hint?: string; trailing?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-extrabold text-ink">{label}</span>
      <span className="flex items-center gap-3 rounded-2xl bg-panel-strong pl-4 pr-2 ring-1 ring-line transition-[box-shadow,ring-color] focus-within:ring-2 focus-within:ring-accent/60 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]">
        <span className="text-muted" aria-hidden="true">
          {icon}
        </span>
        {children}
        {trailing}
      </span>
      {hint && <span className="mt-1.5 block text-xs font-semibold text-muted">{hint}</span>}
    </label>
  )
}

function Brand({ avatar, host, lang, compact }: { avatar: string | null; host: string; lang: Lang; compact?: boolean }) {
  const size = compact ? 'h-11 w-11' : 'h-14 w-14'
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <span className="absolute -inset-1 rounded-full bg-[conic-gradient(from_120deg,var(--color-coral-ink),var(--color-sun-ink),var(--color-mint-ink),var(--color-sky-ink),var(--color-lavender-ink),var(--color-coral-ink))] opacity-80 blur-[1px]" aria-hidden="true" />
        <div className={`relative flex ${size} items-center justify-center overflow-hidden rounded-full bg-mint-bg ring-[3px] ring-panel-strong`} role="img" aria-label={host}>
          {avatar && <img src={avatar} alt="" className="h-full w-full object-cover" />}
        </div>
      </div>
      <div className="min-w-0">
        <h1 className={`truncate font-black tracking-tight text-ink ${compact ? 'text-lg' : 'text-xl'}`}>{t('title', lang)}</h1>
        {!compact && <p className="truncate text-sm font-semibold text-muted">{t('subtitle', lang, { host })}</p>}
      </div>
    </div>
  )
}
