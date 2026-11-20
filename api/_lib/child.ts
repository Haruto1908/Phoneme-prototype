/**
 * Side-view child choices, mirrored from src/lib/children.ts (the API must not import browser code).
 * 'auto' picks the child from the account's primary language; the others pin one region's child.
 * The list may name regions whose portrait is not ready yet: the client then falls back to the default child.
 */
export const CHILD_CHOICES = ['auto', 'us', 'jp', 'kr', 'mx'] as const
export type ChildChoice = (typeof CHILD_CHOICES)[number]

/** Any request value → a known choice, or null. */
export function normChild(v: unknown): ChildChoice | null {
  const s = String(v ?? '').trim().toLowerCase()
  return (CHILD_CHOICES as readonly string[]).includes(s) ? (s as ChildChoice) : null
}
