/** Color math for the glow: the accent blended toward the pane background of a dark or light theme. */

export type Rgb = { r: number; g: number; b: number }

export const CLAUDE_ACCENT = '#D97757'

export const parseHex = (hex: string): Rgb | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1] ?? '0', 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi)

export const toHex = (c: Rgb): string =>
  `#${[c.r, c.g, c.b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

/** `t` of the way from `a` to `b`: 0 is `a`, 1 is `b`. */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
})

/**
 * Background tints for the glow, strongest first: the accent at three
 * strengths over the pane background a dark or light theme most likely has.
 * A terminal has no alpha, so these are the colors themselves.
 */
export function glowTints(accent: string, isLight: boolean): string[] {
  const a = parseHex(accent) ?? (parseHex(CLAUDE_ACCENT) as Rgb)
  const bg: Rgb = isLight ? { r: 255, g: 255, b: 255 } : { r: 30, g: 30, b: 30 }
  const strengths = isLight ? [0.3, 0.15, 0.07] : [0.4, 0.2, 0.09]
  return strengths.map(s => toHex(mix(bg, a, s)))
}
