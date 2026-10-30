import type { TileColor } from '../types'

/**
 * Full class names per tile colour. Tailwind only emits classes it can find spelled out
 * in source, so never build these with template strings.
 */
export const palette: Record<TileColor, { bg: string; ink: string; border: string; edgeVar: string }> = {
  mint: { bg: 'bg-mint-bg', ink: 'text-mint-ink', border: 'border-mint-edge', edgeVar: 'var(--color-mint-edge)' },
  teal: { bg: 'bg-teal-bg', ink: 'text-teal-ink', border: 'border-teal-edge', edgeVar: 'var(--color-teal-edge)' },
  coral: { bg: 'bg-coral-bg', ink: 'text-coral-ink', border: 'border-coral-edge', edgeVar: 'var(--color-coral-edge)' },
  lavender: { bg: 'bg-lavender-bg', ink: 'text-lavender-ink', border: 'border-lavender-edge', edgeVar: 'var(--color-lavender-edge)' },
  sun: { bg: 'bg-sun-bg', ink: 'text-sun-ink', border: 'border-sun-edge', edgeVar: 'var(--color-sun-edge)' },
  sky: { bg: 'bg-sky-bg', ink: 'text-sky-ink', border: 'border-sky-edge', edgeVar: 'var(--color-sky-edge)' },
  peach: { bg: 'bg-peach-bg', ink: 'text-peach-ink', border: 'border-peach-edge', edgeVar: 'var(--color-peach-edge)' },
}
