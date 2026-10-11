import { expect, test } from 'claude-code/testing'

import { glowTints, mix, parseHex, toHex } from './color'

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

test('glow tints fade from the accent toward the background, three steps, per theme', () => {
  const dark = glowTints('#D97757', false)
  const light = glowTints('#D97757', true)
  expect(dark).toHaveLength(3)
  expect(light).toHaveLength(3)
  const red = (hex: string) => parseHex(hex)?.r ?? 0
  expect(red(dark[0] ?? '') > red(dark[1] ?? '') && red(dark[1] ?? '') > red(dark[2] ?? '')).toBe(true)
  expect(red(light[0] ?? '') < red(light[1] ?? '') && red(light[1] ?? '') < red(light[2] ?? '')).toBe(true)
  expect(glowTints('garbage', false)).toEqual(dark)
})
