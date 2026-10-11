/**
 * Color math for the glass: the pane is a slab of smoked glass lit from the top by the accent and cooling toward a violet
 * at the bottom, and Claude's attention is light moving through it. A terminal has no alpha or blur, so every tint here
 * is the color itself, blended over the slab's own color for the row it sits on.
 */

export type Rgb = { r: number; g: number; b: number }

export const CLAUDE_ACCENT = '#D97757'

export const parseHex = (hex: string): Rgb | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1] ?? '0', 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi)

export const toHex = (c: Rgb): string =>
  `#${[c.r, c.g, c.b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

/** `t` of the way from `a` to `b`: 0 is `a`, 1 is `b`. */
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
})

/** An ease in and out over 0..1, so a gradient has no visible band where it starts or stops. */
export const smoothstep = (t: number): number => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** A gradient through evenly spaced stops: 0 is the first, 1 the last. */
export function ramp(stops: readonly Rgb[], t: number): Rgb {
  if (stops.length === 0) return { r: 0, g: 0, b: 0 }
  if (stops.length === 1) return stops[0] as Rgb
  const x = clamp(t, 0, 1) * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(x))
  return mix(stops[i] as Rgb, stops[i + 1] as Rgb, x - i)
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 }
export const BLACK: Rgb = { r: 0, g: 0, b: 0 }
/** the cool end of the dusk: where the accent's light fades to at the bottom of the pane */
const VIOLET: Rgb = { r: 124, g: 111, b: 216 }
/** the background a dark terminal most likely has, which the glass fades into at its edges */
const NIGHT: Rgb = { r: 18, g: 18, b: 18 }

/** The hues git states are tinted with, for chips and the status pill; the letters themselves keep the theme's colors. */
export type StateHue = 'modified' | 'staged' | 'untracked' | 'added' | 'deleted' | 'renamed' | 'conflicted' | 'clean'

export type Palette = {
  isLight: boolean
  accent: Rgb
  violet: Rgb
  /** the pane background the theme most likely has, under the slab */
  base: Rgb
  /** the slab at its top row and its bottom row */
  top: Rgb
  bottom: Rgb
  /**
   * how much of the slab shows in the outermost cells: the columns at the left and right, and the top and bottom rows;
   * the rest is the terminal's own background, so the glass has no hard border
   */
  edge: number
  fringe: number
  /** how far a hover lifts a row toward the light */
  lift: number
  /** the legend's shelf, a touch brighter than the slab around it */
  shelf: number
  /** the title's gradient, focused and not */
  title: Rgb[]
  titleSoft: Rgb[]
  /** folder names, the branch, and the faint structure tones */
  folder: Rgb
  silver: Rgb
  /** the shimmer's band: cool moonlight while Claude reads, an ember while it writes */
  moon: [Rgb, Rgb]
  ember: [Rgb, Rgb]
  /** strongest share of the accent the glow lays over the slab */
  glow: number
  hues: Record<StateHue, Rgb>
  added: Rgb
  removed: Rgb
}

const cache = new Map<string, Palette>()

/** The glass for an accent and a dark or light theme; a bad accent falls back to Claude's. */
export function glassPalette(accentHex: string, isLight: boolean): Palette {
  const key = `${accentHex}|${isLight}`
  const hit = cache.get(key)
  if (hit) return hit
  const accent = parseHex(accentHex) ?? (parseHex(CLAUDE_ACCENT) as Rgb)
  const violet = VIOLET
  const p: Palette = isLight
    ? {
        isLight,
        accent,
        violet,
        base: WHITE,
        top: mix(WHITE, accent, 0.07),
        bottom: mix(WHITE, violet, 0.06),
        edge: 0.4,
        fringe: 0.6,
        lift: 0.06,
        shelf: 0.025,
        title: [mix(accent, BLACK, 0.15), mix(accent, violet, 0.5), mix(violet, BLACK, 0.2)],
        titleSoft: [mix(accent, BLACK, 0.3), mix(mix(accent, violet, 0.5), BLACK, 0.3), mix(violet, BLACK, 0.35)],
        folder: { r: 44, g: 36, b: 52 },
        silver: { r: 104, g: 100, b: 128 },
        moon: [{ r: 150, g: 146, b: 178 }, { r: 70, g: 60, b: 140 }],
        ember: [mix(accent, WHITE, 0.35), mix(accent, BLACK, 0.3)],
        glow: 0.26,
        hues: {
          modified: { r: 196, g: 140, b: 30 },
          staged: { r: 46, g: 150, b: 80 },
          untracked: { r: 30, g: 150, b: 120 },
          added: { r: 30, g: 150, b: 120 },
          deleted: { r: 210, g: 70, b: 70 },
          renamed: { r: 70, g: 110, b: 210 },
          conflicted: { r: 220, g: 40, b: 40 },
          clean: { r: 46, g: 150, b: 80 },
        },
        added: { r: 46, g: 160, b: 67 },
        removed: { r: 207, g: 34, b: 46 },
      }
    : {
        isLight,
        accent,
        violet,
        base: NIGHT,
        top: mix(NIGHT, accent, 0.09),
        bottom: mix(NIGHT, violet, 0.08),
        edge: 0.4,
        fringe: 0.6,
        lift: 0.075,
        shelf: 0.035,
        title: [mix(accent, WHITE, 0.1), mix(accent, WHITE, 0.55), mix(violet, WHITE, 0.45)],
        titleSoft: [mix(accent, WHITE, 0.3), mix(accent, WHITE, 0.6), mix(violet, WHITE, 0.6)],
        folder: { r: 241, g: 233, b: 228 },
        silver: { r: 169, g: 166, b: 194 },
        moon: [{ r: 132, g: 128, b: 162 }, { r: 232, g: 230, b: 255 }],
        ember: [mix(accent, NIGHT, 0.3), mix(accent, WHITE, 0.6)],
        glow: 0.38,
        hues: {
          modified: { r: 226, g: 184, b: 107 },
          staged: { r: 124, g: 203, b: 143 },
          untracked: { r: 111, g: 207, b: 174 },
          added: { r: 111, g: 207, b: 174 },
          deleted: { r: 238, g: 127, b: 127 },
          renamed: { r: 143, g: 176, b: 242 },
          conflicted: { r: 255, g: 95, b: 95 },
          clean: { r: 124, g: 203, b: 143 },
        },
        added: { r: 63, g: 185, b: 80 },
        removed: { r: 248, g: 81, b: 73 },
      }
  cache.set(key, p)
  return p
}

/** The slab under row `i` of `n`: the warm wash at the top easing into the cool at the bottom. */
export const glassRow = (p: Palette, i: number, n: number): Rgb => {
  const slab = mix(p.top, p.bottom, smoothstep(n <= 1 ? 0 : i / (n - 1)))
  return i === 0 || i === n - 1 ? mix(p.base, slab, p.fringe) : slab // the top and bottom rows fade toward the terminal
}

/** A color in the outermost columns: partly the terminal's own background, so the slab's sides fade instead of ending. */
export const feather = (p: Palette, c: Rgb): Rgb => mix(p.base, c, p.edge)

/** How strongly the glow reaches a row `distance` rows from the file: a soft bell, nothing past four rows. */
export const glowWeight = (distance: number): number => (Math.abs(distance) > 4 ? 0 : Math.exp(-(distance * distance) / (2 * 1.5 * 1.5)))

/** A row's color with the glow laid over it, `factor` 1 while the edit runs and fading to 0 after. */
export const glowOver = (p: Palette, under: Rgb, distance: number, factor: number): Rgb =>
  mix(under, p.accent, p.glow * glowWeight(distance) * clamp(factor, 0, 1))

/** The shimmer band's strength at character `i` with the sweep's head at `head`: 1 at the head, easing to 0 three away. */
export const sweepAt = (i: number, head: number): number => smoothstep(1 - Math.abs(i - head) / 3)

export type Run = { text: string; color: string }

/**
 * Text split into runs along a gradient, at most `maxRuns` of them, so a long line never draws as one element per cell.
 * The runs' text joined is the text.
 */
export function gradientRuns(text: string, stops: readonly Rgb[], maxRuns: number): Run[] {
  const chars = [...text]
  const n = chars.length
  if (n === 0) return []
  const runs = Math.max(1, Math.min(n, Math.floor(maxRuns)))
  const out: Run[] = []
  for (let k = 0; k < runs; k++) {
    const from = Math.floor((k * n) / runs)
    const to = Math.floor(((k + 1) * n) / runs)
    if (to <= from) continue
    out.push({ text: chars.slice(from, to).join(''), color: toHex(ramp(stops, runs === 1 ? 0 : k / (runs - 1))) })
  }
  return out
}
