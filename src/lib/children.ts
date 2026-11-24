/**
 * Side-view children by region. Every portrait shares one geometry: it is aligned onto the original girl's profile
 * (Others/videos/tongue_anim/align_portrait.mjs), so the mouth cutaway, teeth, tongue and moving jaw measured on
 * that photo (PORTRAIT_GIRL) fit every child. Per child: the photo, its backdrop colour, her own lip seam (the
 * moving jaw is cut along it) and, for lighter or darker skin, the tissue tone around the cutaway.
 *
 * Adding a child: align the photo, save it as public/assets/children/<region>.jpg and set `src`, `bg` (the
 * backdrop colour the script prints) and her `seam`/`cut` below (Others/videos/tongue_anim/REGIONAL_CHILD_PORTRAITS.md). A region without a photo shows as "Coming soon" and falls back to
 * the default child.
 */
import { PORTRAIT_GIRL } from '../animations/th-sideview.js'
import type { Lang } from './i18n'
import type { StringKey } from './locales/en'
import { asset } from './media'

/** Must match api/_lib/child.ts. */
export type ChildChoice = 'auto' | 'us' | 'jp' | 'kr' | 'mx'
export type Region = Exclude<ChildChoice, 'auto'>

interface ChildEntry {
  region: Region
  label: StringKey
  /** portrait under public/, aligned to the 864×1152 reference frame; null = not made yet */
  src: string | null
  /** backdrop colour of the photo (fills the sliver the moving lower lip uncovers) */
  bg?: string
  /**
   * This child's lip line (image px, from the lip front back to the mouth corner) and the cheek cut that starts just
   * behind her corner: the lower lip + chin piece is cut along these, so they must follow her own mouth.
   */
  seam?: [number, number][]
  cut?: [number, number][]
  /** front-view skin tone, matched to her cheek in the photo */
  skin?: string
  /** side-view colour overrides, e.g. the inner-mouth tissue tone to match a lighter or darker skin */
  theme?: Record<string, string>
}

/** In picker order. */
export const CHILDREN: readonly ChildEntry[] = [
  {
    region: 'us',
    label: 'childUs',
    src: 'assets/children/us.jpg',
    bg: '#fefefe',
    skin: '#fed6c2',
    seam: [[731, 599], [700, 598.5], [680, 597.5], [658, 596]],
    cut: [[642, 588], [626, 573], [612, 553], [602, 700], [594, 900]],
  },
  {
    region: 'jp',
    label: 'childJp',
    src: 'assets/children/jp.jpg',
    bg: '#fefefe',
    skin: '#fee8e1',
    // her face is turned very slightly toward us, so the mouth corner sits further back
    seam: [[731, 599.5], [700, 600.5], [670, 599.5], [645, 597]],
    cut: [[629, 589], [613, 573], [599, 553], [592, 700], [586, 900]],
    // paler, pinker skin: lighter tissue around the cutaway
    theme: { body: '#f9dccf', line: '#d9ab9b' },
  },
  {
    region: 'kr',
    label: 'childKr',
    src: 'assets/children/kr.jpg',
    bg: '#fefefe',
    // her cheek measures within a few levels of the Japanese child's, so she shares that skin and tissue tone
    skin: '#fee8e1',
    seam: [[731, 600.5], [700, 599.5], [675, 599.5], [652, 598]],
    cut: [[636, 589], [620, 573], [606, 553], [598, 700], [590, 900]],
    theme: { body: '#f9dccf', line: '#d9ab9b' },
  },
  {
    region: 'mx',
    label: 'childMx',
    src: 'assets/children/mx.jpg',
    bg: '#fdfdfd',
    // her cheek is a shade warmer than the US child's, so the default tissue tone fits
    skin: '#fdd2bd',
    seam: [[731, 599.5], [700, 597], [675, 598.5], [648, 596]],
    cut: [[632, 588], [616, 573], [602, 553], [594, 700], [588, 900]],
  },
]

export const DEFAULT_REGION: Region = 'us'

/** 'auto' picks the child that matches the account's primary language. */
const LANG_REGION: Record<Lang, Region> = { en: 'us', ja: 'jp', ko: 'kr', 'es-MX': 'mx' }

export const childEntry = (r: Region): ChildEntry => CHILDREN.find((c) => c.region === r) ?? CHILDREN[0]
export const childReady = (r: Region): boolean => !!childEntry(r).src

export function normChild(v: unknown): ChildChoice | null {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'auto' || CHILDREN.some((c) => c.region === s) ? (s as ChildChoice) : null
}

/** The child actually shown: the chosen (or the language's) region if its photo exists, else the default child. */
export function resolveChild(choice: ChildChoice, lang: Lang): Region {
  const want = choice === 'auto' ? LANG_REGION[lang] : choice
  return childReady(want) ? want : DEFAULT_REGION
}

/** Side-view portrait preset for a region; `view` is the window the player shows (nose to throat). */
export function childPortrait(r: Region, view: [number, number, number, number]) {
  const c = childReady(r) ? childEntry(r) : childEntry(DEFAULT_REGION)
  return {
    ...PORTRAIT_GIRL,
    src: asset(c.src as string),
    view,
    jaw: {
      ...(PORTRAIT_GIRL.jaw as Record<string, unknown>),
      ...(c.bg ? { bg: c.bg } : {}),
      ...(c.seam ? { seam: c.seam } : {}),
      ...(c.cut ? { cut: c.cut } : {}),
    },
    /** passed to createThSideview as `theme` */
    theme: c.theme,
    /** passed to createThFrontview as `skin`, so the front view has the same child's skin */
    skin: c.skin,
  }
}
