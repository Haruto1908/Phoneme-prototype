import type { TileColor } from '../types'
import { CuePlaceholder } from './CuePlaceholder'
import { palette } from './palette'

interface TileProps {
  id: string
  /** Big symbol shown to the child (from the active symbol system). */
  symbol: string
  /** Small secondary line for adults: IPA or the word. */
  detail?: string
  cue: string
  color: TileColor
  playing: boolean
  /** Shows a small buzz badge after the symbol (voiced sounds). */
  voiced?: boolean
  wide?: boolean
  ariaLabel: string
  onPress: (id: string) => void
}

/**
 * One chart tile. Sized for a small finger on an iPad: the whole card is the button.
 * Colour classes come from palette.ts so Tailwind can see them spelled out.
 */
export function Tile({ id, symbol, detail, cue, color, playing, voiced, wide, ariaLabel, onPress }: TileProps) {
  const c = palette[color]
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={playing}
      onClick={() => onPress(id)}
      className={[
        'no-select group relative flex min-h-[200px] flex-col rounded-tile p-4 text-left',
        'transition-transform duration-150 ease-out',
        'active:translate-y-[4px] active:scale-[0.985]',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-ink/40',
        'shadow-[0_8px_0_0_var(--edge),0_14px_28px_-12px_rgba(43,53,69,0.35)]',
        'active:shadow-[0_3px_0_0_var(--edge),0_6px_14px_-10px_rgba(43,53,69,0.35)]',
        c.bg,
        playing ? 'animate-wiggle ring-4 ring-white/80' : '',
        wide ? 'col-span-2' : '',
      ].join(' ')}
      style={{ ['--edge' as string]: c.edgeVar }}
    >
      {/* symbol */}
      <div className={`flex items-baseline gap-2 ${c.ink}`}>
        <span className="font-ipa text-6xl font-bold leading-none sm:text-7xl">{symbol}</span>
        {voiced && <BuzzBadge />}
        {detail && <span className="text-sm font-semibold opacity-60">{detail}</span>}
      </div>

      {/* picture cue */}
      <div className={`mt-3 flex-1 ${wide ? 'max-h-32' : ''}`}>
        <CuePlaceholder cue={cue} color={color} />
      </div>

      {/* sound indicator */}
      <SoundBars active={playing} className={`absolute right-4 top-4 ${c.ink}`} />
    </button>
  )
}

/** Small "voice on" mark: three vibration waves, so the voiced th tile looks different from the quiet one. */
function BuzzBadge() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 self-center opacity-80" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M8 12c3 3 3 5 0 8" />
      <path d="M14 8c5 5 5 11 0 16" />
      <path d="M20 4c8 8 8 16 0 24" />
    </svg>
  )
}

function SoundBars({ active, className }: { active: boolean; className?: string }) {
  return (
    <div className={`flex h-6 items-end gap-[3px] ${className ?? ''}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`block w-[5px] rounded-full bg-current transition-opacity ${active ? 'animate-bars opacity-90' : 'opacity-25'}`}
          style={{ height: `${[14, 22, 18, 10][i]}px`, animationDelay: `${i * 0.12}s`, transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  )
}