import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { errorText, t, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'
import type { User } from '../lib/auth'
import type { Sound } from '../types'
import { CSV_KINDS, managerApi, managerCsvUrl, type CsvKind, type StudentReply, type StudentRow } from '../lib/manager'
import { reasonText, type ReasonKey } from '../lib/pronounce/reasons'
import { AccountMenu, IconButton, SectionTitle } from './controls'
import { BackIcon, ChartIcon, DownloadIcon, PeopleIcon, ReplayIcon, StarIcon } from './icons'

interface ManagerDashboardProps {
  user: User
  lang: Lang
  onLang: (l: Lang) => void
  theme: Theme
  onTheme: (t: Theme) => void
  onLogout: () => void
  /** Manifest sounds, for the column order and the labels. */
  sounds: Sound[]
  host: string
  onOpenLesson: () => void
}

const CSV_LABEL: Record<CsvKind, 'csvStudents' | 'csvProgress' | 'csvSessions' | 'csvAttempts'> = {
  students: 'csvStudents',
  progress: 'csvProgress',
  sessions: 'csvSessions',
  attempts: 'csvAttempts',
}

/**
 * What a teacher or manager opens instead of the lesson: one row per account with how much it has been used,
 * and, for the chosen student, the progress per sound plus the latest attempts and mode changes. Everything is
 * read-only; the four CSV buttons export the same data for every student at once.
 *
 * Numbers are fine here — the "no numbers" rule is about what a four-year-old sees, not the adult looking after
 * them. The hidden baseline is shown, because the whole point of this page is to judge progress against it.
 */
export function ManagerDashboard({ user, lang, onLang, theme, onTheme, onLogout, sounds, host, onOpenLesson }: ManagerDashboardProps) {
  const [rows, setRows] = useState<StudentRow[] | null>(null)
  const [totals, setTotals] = useState({ students: 0, accounts: 0, attempts: 0, modeEvents: 0 })
  const [baselineAttempts, setBaselineAttempts] = useState(3)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<StudentReply | null>(null)

  const load = useCallback(() => {
    managerApi
      .students()
      .then((d) => {
        setRows(d.students)
        setTotals(d.totals)
        setBaselineAttempts(d.baselineAttempts)
        setError(null)
      })
      .catch((e: { code?: string }) => setError(e.code ?? 'server'))
  }, [])

  useEffect(load, [load])

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    managerApi
      .student(selected)
      .then((d) => !cancelled && setDetail(d))
      .catch(() => !cancelled && setSelected(null))
    return () => {
      cancelled = true
    }
  }, [selected])

  // the detail belongs to whoever is selected now; a stale one from the previous row must not flash up
  const shown = detail && detail.student.email === selected ? detail : null

  const time = useMemo(() => new Intl.DateTimeFormat(lang === 'jp' ? 'ja-JP' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }), [lang])
  const when = (iso: string | null) => (iso ? time.format(new Date(iso)) : t('never', lang))

  return (
    <main className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
      <header className="no-select panel animate-rise relative z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-panel px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lavender-bg text-lavender-ink ring-1 ring-black/5 dark:ring-white/10" aria-hidden="true">
            <ChartIcon className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight text-ink sm:text-2xl">{t('managerTitle', lang)}</h1>
            <p className="mt-0.5 truncate text-sm font-semibold text-muted">{t('managerHint', lang)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={onOpenLesson}
            className="flex h-11 items-center gap-2 rounded-full bg-panel-strong px-4 text-sm font-extrabold text-ink shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
          >
            <BackIcon className="h-5 w-5" />
            {t('managerBack', lang)}
          </button>
          <IconButton label={t('refresh', lang)} onClick={load}>
            <ReplayIcon className="h-6 w-6" />
          </IconButton>
          <AccountMenu email={user.email} role={user.role} lang={lang} theme={theme} usage={null} onTheme={onTheme} onLang={onLang} onLogout={onLogout} />
        </div>
      </header>

      {error && (
        <p className="panel rounded-panel px-4 py-3 text-sm font-bold text-accent" role="alert">
          {errorText(error, lang)}
        </p>
      )}

      {/* totals */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label={t('students', lang)} value={totals.students} tone="bg-mint-bg text-mint-ink" />
        <Stat label={t('totalAttempts', lang)} value={totals.attempts} tone="bg-sun-bg text-sun-ink" />
        <Stat label={t('totalModes', lang)} value={totals.modeEvents} tone="bg-sky-bg text-sky-ink" />
        <div className="panel flex flex-col justify-center gap-2 rounded-panel px-4 py-3">
          <span className="text-xs font-extrabold uppercase tracking-wide text-muted">{t('exports', lang)}</span>
          <div className="flex flex-wrap gap-1.5">
            {CSV_KINDS.map((kind) => (
              <a
                key={kind}
                href={managerCsvUrl(kind)}
                download
                className="flex h-8 items-center gap-1.5 rounded-full bg-panel-strong px-3 text-xs font-extrabold text-ink shadow-raise ring-1 ring-line transition-transform hover:-translate-y-px active:translate-y-[2px] active:shadow-none"
              >
                <DownloadIcon className="h-4 w-4" />
                {t(CSV_LABEL[kind], lang)}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-[3fr_2fr]">
        {/* student list */}
        <section className="panel animate-rise rounded-panel p-4 [animation-delay:60ms]" aria-label={t('students', lang)}>
          <SectionTitle icon={<PeopleIcon className="h-5 w-5" />} tone="mint">
            {t('students', lang)}
          </SectionTitle>
          {!rows ? (
            <Placeholder>{t('working', lang)}</Placeholder>
          ) : rows.length === 0 ? (
            <Placeholder>{t('noStudents', lang)}</Placeholder>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-muted">
                    <Th>{t('studentCol', lang)}</Th>
                    <Th>{t('lastSeen', lang)}</Th>
                    <Th align="center">{t('modesCol', lang)}</Th>
                    <Th align="right">{t('totalAttempts', lang)}</Th>
                    <Th align="center">{t('avgStars', lang)}</Th>
                    <Th align="right">{t('soundsCol', lang)}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const on = r.email === selected
                    const toggle = () => setSelected(on ? null : r.email)
                    return (
                      <tr
                        key={r.email}
                        // the whole row is the target (easier on a tablet), so it carries the focus and the keys
                        tabIndex={0}
                        aria-selected={on}
                        onClick={toggle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggle()
                          }
                        }}
                        className={`cursor-pointer border-t border-line transition-colors focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-accent ${on ? 'bg-sunk' : 'hover:bg-sunk/60'}`}
                      >
                        <Td>
                          <span className="flex items-center gap-2">
                            <span className="truncate font-bold text-ink" title={r.email}>
                              {r.email}
                            </span>
                            {r.role === 'manager' && (
                              <span className="shrink-0 rounded-full bg-lavender-bg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-lavender-ink">{t('manager', lang)}</span>
                            )}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-muted">{when(r.lastSeenAt)}</Td>
                        <Td align="center" className="whitespace-nowrap tabular-nums font-semibold text-ink">
                          {r.modes.avatar} / {r.modes.human} / {r.modes.both}
                        </Td>
                        <Td align="right" className="tabular-nums font-bold text-ink">
                          {r.attempts}
                        </Td>
                        <Td align="center">{r.avgStars === null ? <span className="text-muted">—</span> : <Stars value={r.avgStars} />}</Td>
                        <Td align="right" className="tabular-nums font-semibold text-ink">
                          {Object.keys(r.sounds).length}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* one student */}
        <section className="panel animate-rise rounded-panel p-4 [animation-delay:120ms]" aria-label={t('progressPerSound', lang)}>
          {!selected ? (
            <>
              <SectionTitle icon={<ChartIcon className="h-5 w-5" />} tone="lavender">
                {t('progressPerSound', lang)}
              </SectionTitle>
              <Placeholder>{t('selectStudent', lang)}</Placeholder>
            </>
          ) : !shown ? (
            <Placeholder>{t('working', lang)}</Placeholder>
          ) : (
            <StudentDetail detail={shown} sounds={sounds} lang={lang} host={host} baselineAttempts={baselineAttempts} when={when} />
          )}
        </section>
      </div>
    </main>
  )
}

function StudentDetail({
  detail,
  sounds,
  lang,
  host,
  baselineAttempts,
  when,
}: {
  detail: StudentReply
  sounds: Sound[]
  lang: Lang
  host: string
  baselineAttempts: number
  when: (iso: string | null) => string
}) {
  const { student, recentAttempts, recentEvents } = detail
  const label = (id: string) => sounds.find((s) => s.id === id)?.ipa ?? id
  // manifest order first, then anything the manifest no longer has
  const ids = [...sounds.map((s) => s.id).filter((id) => student.sounds[id]), ...Object.keys(student.sounds).filter((id) => !sounds.some((s) => s.id === id))]

  return (
    <>
      <SectionTitle icon={<ChartIcon className="h-5 w-5" />} tone="lavender">
        <span className="min-w-0 truncate" title={student.email}>
          {student.email}
        </span>
      </SectionTitle>

      {ids.length === 0 ? (
        <Placeholder>{t('noActivity', lang)}</Placeholder>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs font-extrabold uppercase tracking-wide text-muted">
                <Th>{t('soundCol', lang)}</Th>
                <Th align="right">{t('totalAttempts', lang)}</Th>
                <Th align="right">{t('baseline', lang)}</Th>
                <Th align="right">{t('latestCol', lang)}</Th>
                <Th align="right">{t('bestCol', lang)}</Th>
                <Th align="right">{t('improvement', lang)}</Th>
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const s = student.sounds[id]
                return (
                  <tr key={id} className="border-t border-line">
                    <Td className="font-black text-ink">/{label(id)}/</Td>
                    <Td align="right" className="tabular-nums font-semibold text-ink">
                      {s.attempts}
                    </Td>
                    <Td align="right" className="tabular-nums text-muted">
                      {s.baseline === null ? t('baselineForming', lang, { n: s.attempts, m: baselineAttempts }) : s.baseline}
                    </Td>
                    <Td align="right" className="tabular-nums font-semibold text-ink">
                      {s.last}
                    </Td>
                    <Td align="right" className="tabular-nums font-semibold text-ink">
                      {s.best}
                    </Td>
                    <Td align="right">
                      <Delta value={s.improvement} />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-muted">{t('recentAttempts', lang)}</h3>
      {recentAttempts.length === 0 ? (
        <Placeholder>{t('noActivity', lang)}</Placeholder>
      ) : (
        <ul className="mt-2 flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
          {recentAttempts.map((a) => (
            <li key={a.at} className="rounded-2xl bg-sunk px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-black text-ink">/{label(a.soundId)}/</span>
                <span className="flex items-center gap-2">
                  <span className="flex" aria-label={`${a.stars} / 3`}>
                    {[0, 1, 2].map((i) => (
                      <StarIcon key={i} filled={i < a.stars} className={`h-4 w-4 ${i < a.stars ? 'text-sun-ink' : 'text-ink/15'}`} />
                    ))}
                  </span>
                  <span className="tabular-nums text-sm font-bold text-ink">{a.score}</span>
                  <Delta value={a.improvement} />
                </span>
              </div>
              <p className="mt-0.5 text-xs font-medium leading-snug text-muted">
                {when(a.at)} · {t(a.phase === 'tracked' ? 'phaseTracked' : 'phaseBaseline', lang)} · {reasonText(a.reasonKey as ReasonKey, lang, host)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-muted">{t('recentSessions', lang)}</h3>
      {recentEvents.length === 0 ? (
        <Placeholder>{t('noActivity', lang)}</Placeholder>
      ) : (
        <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto pr-1 text-sm">
          {recentEvents.map((e) => (
            <li key={e.at} className="flex items-baseline justify-between gap-2 border-t border-line py-1 first:border-0">
              <span className="font-bold text-ink">{t(e.mode, lang)}</span>
              <span className="text-xs font-medium text-muted">
                {t(e.event === 'start' ? 'eventStart' : 'eventSwitch', lang)} · {when(e.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="panel flex items-center gap-3 rounded-panel px-4 py-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black ring-1 ring-black/5 tabular-nums dark:ring-white/10 ${tone}`}>{value}</span>
      <span className="text-sm font-extrabold text-ink">{label}</span>
    </div>
  )
}

/** Average stars: filled to the nearest half, with the number beside it. */
function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${value.toFixed(1)} / 3`}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} filled={value >= i + 0.5} className={`h-4 w-4 ${value >= i + 0.5 ? 'text-sun-ink' : 'text-ink/15'}`} />
      ))}
      <span className="ml-0.5 tabular-nums text-xs font-bold text-muted">{value.toFixed(1)}</span>
    </span>
  )
}

/** Improvement against the baseline: green up, red down, dash while the baseline is still forming. */
function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>
  const tone = value > 0 ? 'text-mint-ink' : value < 0 ? 'text-accent' : 'text-muted'
  return (
    <span className={`tabular-nums text-sm font-black ${tone}`}>
      {value > 0 ? '+' : ''}
      {value}
    </span>
  )
}

type Align = 'left' | 'right' | 'center'
/** Written out rather than interpolated, so Tailwind sees the class names. */
const ALIGN: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' }

function Th({ children, align = 'left' }: { children: ReactNode; align?: Align }) {
  return <th className={`px-2 pb-2 font-extrabold ${ALIGN[align]}`}>{children}</th>
}

function Td({ children, align = 'left', className = '' }: { children: ReactNode; align?: Align; className?: string }) {
  return <td className={`max-w-[14rem] px-2 py-2.5 ${ALIGN[align]} ${className}`}>{children}</td>
}

function Placeholder({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-2xl bg-sunk px-4 py-6 text-center text-sm font-semibold text-muted">{children}</p>
}
