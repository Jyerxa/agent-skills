/**
 * Timing for the fold and unfold animation: rows ripple in from the top, or out from the bottom, each a step after the last.
 * With the ripple off, the folder's own row flashes instead.
 */

import type { FoldAnim as Anim } from '../types'
import { clamp, smoothstep } from './color'

/** the whole ripple takes at most this long, however many rows */
export const ANIM_MAX_MS = 400
export const ANIM_MIN_STEP_MS = 12
export const ANIM_MAX_STEP_MS = 40
/** how long a flash takes to fade: about as long as the glow takes after an edit, so it reads as the same light */
export const FLASH_MS = 450

/** The delay between one row and the next, so a big folder ripples faster per row than a small one. */
export const stepFor = (count: number): number => clamp(Math.floor(ANIM_MAX_MS / Math.max(1, count)), ANIM_MIN_STEP_MS, ANIM_MAX_STEP_MS)

/** How long a row stays dim as it arrives or before it leaves. */
export const fadeOf = (a: Anim): number => a.stepMs * 2

/** When the animation has nothing left to show: a fold ends as its first row leaves, an unfold once its last row has brightened, a flash once it has faded. */
export const durationOf = (a: Anim): number =>
  a.kind === 'flash' ? FLASH_MS : a.kind === 'fold' ? a.count * a.stepMs : a.count * a.stepMs + fadeOf(a)

export const isDone = (a: Anim, elapsed: number): boolean => elapsed >= durationOf(a)

/** How lit a flashing row is `elapsed` ms in: fully at the press, easing out to nothing. */
export const flashLevel = (elapsed: number): number => 1 - smoothstep(elapsed / FLASH_MS)

export type RowPhase = 'hidden' | 'dim' | 'shown'

/** How descendant row `i` (0 at the top) looks `elapsed` ms in: unfolding, rows arrive top down; folding, they leave bottom up. */
export function rowPhase(a: Anim, i: number, elapsed: number): RowPhase {
  const fade = fadeOf(a)
  if (a.kind === 'unfold') {
    const arrivesAt = i * a.stepMs
    if (elapsed < arrivesAt) return 'hidden'
    return elapsed < arrivesAt + fade ? 'dim' : 'shown'
  }
  const leavesAt = (a.count - i) * a.stepMs
  if (elapsed >= leavesAt) return 'hidden'
  return elapsed >= leavesAt - fade ? 'dim' : 'shown'
}
