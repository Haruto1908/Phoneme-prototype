/** Types for th-frontview.js (copied from Others/videos/tongue_anim, where it is developed and previewed). */
import type { ThSound } from './th-sideview.js'

export interface ThFrontview {
  readonly el: SVGSVGElement
  readonly sound: ThSound
  /** Draw the front view at time t (seconds) — drive it from the side view's onTime so both stay in step. */
  render(t: number): void
  setSound(s: ThSound): void
  destroy(): void
}

export function frontPoseAt(t: number, sound?: ThSound): Record<string, number>
export function createThFrontview(container: Element, options?: { sound?: ThSound }): ThFrontview
