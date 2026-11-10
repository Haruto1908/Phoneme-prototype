import { useEffect, useState } from 'react'
import App from './App'
import { AuthPage } from './components/AuthPage'
import { ManagerDashboard } from './components/ManagerDashboard'
import { auth, type User } from './lib/auth'
import { asset } from './lib/media'
import { readLang, writeLang } from './lib/settings'
import { applyTheme, readTheme, writeTheme, type Theme } from './lib/theme'
import { useManifest } from './lib/useManifest'
import { t, type Lang } from './lib/i18n'

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
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.title = t('title', lang)
  }, [lang])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function onLang(l: Lang) {
    setLang(l)
    writeLang(l)
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
        onSignedIn={setUser}
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
      onManager={isManager ? () => setManagerView(true) : undefined}
    />
  )
}
