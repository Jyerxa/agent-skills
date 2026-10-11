/** Timing for the fold and unfold animation: rows ripple in from the top, or out from the bottom, each a step after the last. */

export type AnimKind = 'fold' | 'unfold'

export type Anim = {
  kind: AnimKind
  /** the folder whose rows move */
  path: string
  startedAt: number
  /** how many rows the folder contributes */
  count: number
  stepMs: number
}

/** the whole ripple takes at most this long, however many rows */
export const ANIM_MAX_MS = 400
export const ANIM_MIN_STEP_MS = 12
export const ANIM_MAX_STEP_MS = 40

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi)

/** The delay between one row and the next, so a big folder ripples faster per row than a small one. */
export const stepFor = (count: number): number => clamp(Math.floor(ANIM_MAX_MS / Math.max(1, count)), ANIM_MIN_STEP_MS, ANIM_MAX_STEP_MS)

/** How long a row stays dim as it arrives or before it leaves. */
export const fadeOf = (a: Anim): number => a.stepMs * 2

/** When the animation has nothing left to show: a fold ends as its first row leaves, an unfold once its last row has brightened. */
export const durationOf = (a: Anim): number => (a.kind === 'fold' ? a.count * a.stepMs : a.count * a.stepMs + fadeOf(a))

export const isDone = (a: Anim, elapsed: number): boolean => elapsed >= durationOf(a)

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
