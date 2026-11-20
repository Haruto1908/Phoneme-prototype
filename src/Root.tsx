import { useEffect, useState } from 'react'
import App from './App'
import { AuthPage } from './components/AuthPage'
import { ManagerDashboard } from './components/ManagerDashboard'
import { auth, type User } from './lib/auth'
import { asset } from './lib/media'
import { readLang, writeLang } from './lib/settings'
import { applyTheme, readTheme, writeTheme, type Theme } from './lib/theme'
import { useManifest } from './lib/useManifest'
import { langInfo, t, type Lang } from './lib/i18n'
import { normChild, type ChildChoice } from './lib/children'

/**
 * Gate: ask the server who is logged in; show the sign-in page until there is a user, then the app — or, for a
 * manager, the dashboard. A manager can move between the two: they still need the lesson to try things out.
 */
export default function Root() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [lang, setLang] = useState<Lang>(readLang)
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [managerView, setManagerView] = useState(true)
  const manifest = useManifest()

  useEffect(() => {
    let cancelled = false
    auth
      .me()
      .then((u) => !cancelled && signedIn(u))
      .catch(() => !cancelled && setUser(null))
    return () => {
      cancelled = true
    }
    // runs once on load; signedIn only reads the current language for accounts without one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.title = t('title', lang)
    // the right glyphs (Japanese vs Korean forms), fonts (index.css :lang rules) and screen-reader voice
    document.documentElement.lang = langInfo(lang).locale
  }, [lang])

  /**
   * A user arrived (session restored, logged in or signed up): their primary language wins on every device.
   * Accounts made before languages were stored adopt the language in use now.
   */
  function signedIn(signed: User) {
    const u = { ...signed, child: normChild(signed.child) ?? 'auto' }
    if (u.lang) {
      setLang(u.lang)
      writeLang(u.lang)
      setUser(u)
    } else {
      setUser({ ...u, lang })
      auth.setLanguage(lang).catch(() => {})
    }
  }

  /** The side-view child is saved on the account too, so it follows the user to every device. */
  function onChild(child: ChildChoice) {
    if (!user) return
    setUser({ ...user, child })
    auth.setChild(child).catch(() => {})
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  /** Changing the language while signed in changes the account's primary language (saved on the server). */
  function onLang(l: Lang) {
    setLang(l)
    writeLang(l)
    if (user) {
      setUser({ ...user, lang: l })
      auth.setLanguage(l).catch(() => {})
    }
  }

  function onTheme(th: Theme) {
    setTheme(th)
    writeTheme(th)
  }

  function logout() {
    setUser(null)
    setManagerView(true)
    auth.logout().catch(() => {})
  }

  if (user === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8" aria-busy="true">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-ink/15 border-t-accent" aria-label={t('working', lang)} />
      </div>
    )
  }
  if (!user) {
    const host = manifest.status === 'ready' ? manifest.manifest.host : null
    return (
      <AuthPage
        lang={lang}
        onLang={onLang}
        theme={theme}
        onTheme={onTheme}
        host={host?.name ?? 'Brooke'}
        avatar={host?.portrait ? asset(host.portrait) : null}
        sounds={manifest.status === 'ready' ? manifest.manifest.sounds : []}
        onSignedIn={signedIn}
      />
    )
  }
  const isManager = user.role === 'manager'
  if (isManager && managerView) {
    const host = manifest.status === 'ready' ? manifest.manifest.host : null
    return (
      <ManagerDashboard
        user={user}
        lang={lang}
        onLang={onLang}
        theme={theme}
        onTheme={onTheme}
        onLogout={logout}
        sounds={manifest.status === 'ready' ? manifest.manifest.sounds : []}
        host={host?.name ?? 'Brooke'}
        onOpenLesson={() => setManagerView(false)}
      />
    )
  }
  return (
    <App
      key={user.email}
      user={user}
      lang={lang}
      onLang={onLang}
      theme={theme}
      onTheme={onTheme}
      onLogout={logout}
      onChild={onChild}
      onManager={isManager ? () => setManagerView(true) : undefined}
    />
  )
}
