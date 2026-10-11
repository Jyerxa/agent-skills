import { expect, test } from 'claude-code/testing'

import { feather, glassPalette, glassRow, glowOver, glowWeight, gradientRuns, mix, parseHex, ramp, smoothstep, sweepAt, toHex } from './color'

test('hex parses and prints both ways, with or without the hash', () => {
  expect(parseHex('#D97757')).toEqual({ r: 217, g: 119, b: 87 })
  expect(parseHex('d97757')).toEqual({ r: 217, g: 119, b: 87 })
  expect(parseHex('nope')).toBe(null)
  expect(toHex({ r: 217, g: 119, b: 87 })).toBe('#d97757')
})

test('mix walks from one color to the other', () => {
  const black = { r: 0, g: 0, b: 0 }
  const white = { r: 255, g: 255, b: 255 }
  expect(toHex(mix(black, white, 0))).toBe('#000000')
  expect(toHex(mix(black, white, 1))).toBe('#ffffff')
  expect(toHex(mix(black, white, 0.5))).toBe('#808080')
})

test('smoothstep eases from 0 to 1 and holds outside', () => {
  expect(smoothstep(-1)).toBe(0)
  expect(smoothstep(0)).toBe(0)
  expect(smoothstep(0.5)).toBe(0.5)
  expect(smoothstep(1)).toBe(1)
  expect(smoothstep(2)).toBe(1)
  expect(smoothstep(0.1) < 0.1).toBe(true)
})

test('a ramp passes through its stops in order', () => {
  const stops = [{ r: 0, g: 0, b: 0 }, { r: 100, g: 0, b: 0 }, { r: 100, g: 100, b: 0 }]
  expect(toHex(ramp(stops, 0))).toBe('#000000')
  expect(toHex(ramp(stops, 0.5))).toBe('#640000')
  expect(toHex(ramp(stops, 1))).toBe('#646400')
  expect(toHex(ramp(stops, 0.25))).toBe('#320000')
})

test('the slab is warm at the top and cool at the bottom, per theme', () => {
  const dark = glassPalette('#D97757', false)
  const top = glassRow(dark, 1, 20)
  const bottom = glassRow(dark, 18, 20)
  expect(top.r > bottom.r && top.b < bottom.b, 'red falls and blue rises down the pane').toBe(true)
  expect(toHex(glassRow(dark, 0, 20)), 'the top row fades toward the terminal').toBe(toHex(mix(dark.base, dark.top, dark.fringe)))
  expect(toHex(glassRow(dark, 19, 20)), 'and so does the bottom row').toBe(toHex(mix(dark.base, dark.bottom, dark.fringe)))
  const light = glassPalette('#D97757', true)
  expect(glassRow(light, 0, 20).r > 240, 'the light slab stays near white').toBe(true)
  expect(glassRow(dark, 0, 20).r < 60, 'the dark slab stays dark').toBe(true)
  expect(glassPalette('garbage', false), 'a bad accent falls back to Claude').toEqual(dark)
})

test('the edges feather: an edge cell sits between the terminal and the slab, nearer the terminal', () => {
  const p = glassPalette('#D97757', false)
  const slab = glassRow(p, 5, 20)
  const edge = feather(p, slab)
  const gap = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)
  expect(gap(edge, p.base) < gap(edge, slab), 'nearer the terminal than the slab').toBe(true)
  expect(gap(edge, p.base) > 0, 'but still glass').toBe(true)
  expect(toHex(p.base), 'the dark glass fades into the common #121212').toBe('#121212')
})

test('the glow is a bell around the file, gone four rows out, and fades with its factor', () => {
  expect(glowWeight(0)).toBe(1)
  expect(glowWeight(1) < 1 && glowWeight(1) > glowWeight(2) && glowWeight(2) > glowWeight(3)).toBe(true)
  expect(glowWeight(-2)).toBe(glowWeight(2))
  expect(glowWeight(5)).toBe(0)
  const p = glassPalette('#D97757', false)
  const under = glassRow(p, 5, 20)
  const red = (d: number, f: number) => glowOver(p, under, d, f).r
  expect(red(0, 1) > red(1, 1) && red(1, 1) > red(3, 1)).toBe(true)
  expect(red(0, 1) > red(0, 0.5) && red(0, 0.5) > red(0, 0)).toBe(true)
  expect(toHex(glowOver(p, under, 0, 0))).toBe(toHex(under))
})

test('the shimmer band peaks at its head and is dark three cells away', () => {
  expect(sweepAt(5, 5)).toBe(1)
  expect(sweepAt(4, 5)).toBe(sweepAt(6, 5))
  expect(sweepAt(4, 5) > sweepAt(3, 5)).toBe(true)
  expect(sweepAt(8, 5)).toBe(0)
})

test('gradient runs keep the text, cap the element count, and run from the first stop to the last', () => {
  const stops = [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }]
  const runs = gradientRuns('a long working directory name', stops, 6)
  expect(runs.map(r => r.text).join('')).toBe('a long working directory name')
  expect(runs).toHaveLength(6)
  expect(runs[0]?.color).toBe('#000000')
  expect(runs.at(-1)?.color).toBe('#ffffff')
  expect(gradientRuns('ab', stops, 6)).toHaveLength(2)
  expect(gradientRuns('', stops, 6)).toEqual([])
})
