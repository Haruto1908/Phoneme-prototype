interface HostHeaderProps {
  hostName: string
  portrait: string | null
  /** Short line the operator can read; children don't need to. */
  caption: string
}

/**
 * Top of the chart: the avatar host (full face) so the child meets a character before the mouth close-up.
 * The portrait is a placeholder until the female-avatar idle clip / still is dropped in.
 */
export function HostHeader({ hostName, portrait, caption }: HostHeaderProps) {
  return (
    <header className="no-select flex items-center gap-4 sm:gap-6">
      <div
        className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-dashed border-ink/25 bg-white/70 shadow-[0_8px_20px_-10px_rgba(43,53,69,0.35)] sm:h-24 sm:w-24"
        aria-label={`${hostName}, the avatar host`}
        role="img"
      >
        {portrait ? (
          <img src={portrait} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 64 64" className="h-12 w-12 text-ink/40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
            <circle cx="32" cy="24" r="11" />
            <path d="M12 56c3-11 11-16 20-16s17 5 20 16" />
          </svg>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Tap a sound</h1>
        <p className="mt-1 text-sm font-medium text-muted sm:text-base">{caption}</p>
      </div>
    </header>
  )
}
