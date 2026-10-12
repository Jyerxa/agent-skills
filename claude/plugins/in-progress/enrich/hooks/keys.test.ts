import { expect, test } from 'claude-code/testing'

import { chordFor, DOCS, labelChord, mergeBindings, SCHEMA } from './keys'

const FILE = JSON.stringify({
  $schema: SCHEMA,
  bindings: [
    { context: 'Chat', bindings: { 'ctrl+x e': 'diff:back', 'ctrl+x 1': 'app:cycleDiffBase' } },
    { context: 'DiffDialog', bindings: { q: 'diff:nextSource' } },
  ],
})

test('finds the chord bound to an action where the prompt can reach it', () => {
  expect(chordFor(FILE, 'diff:back')).toBe('ctrl+x e')
  expect(chordFor(FILE, 'diff:nextSource')).toBe(null) // DiffDialog does not reach the prompt
  expect(chordFor(null, 'diff:back')).toBe(null)
  expect(chordFor('{ not json', 'diff:back')).toBe(null)
})

test('labels chords the way the hint line draws them', () => {
  expect(labelChord('ctrl+x e')).toBe('⌃x e')
  expect(labelChord('ctrl+shift+k ctrl+d')).toBe('⌃⇧k ⌃d')
  expect(labelChord('alt+e')).toBe('⌥e')
})

test('merging into no file creates one with $schema and $docs', () => {
  const merged = mergeBindings(null, [{ chord: 'ctrl+x e', action: 'diff:back' }])
  if ('error' in merged) throw new Error(merged.error)
  expect(merged.added).toEqual(['ctrl+x e → diff:back'])
  const file = JSON.parse(merged.text)
  expect(file.$schema).toBe(SCHEMA)
  expect(file.$docs).toBe(DOCS)
  expect(file.bindings).toEqual([{ context: 'Chat', bindings: { 'ctrl+x e': 'diff:back' } }])
})

test('merging keeps what is there, skips a bound action and refuses a taken chord', () => {
  const merged = mergeBindings(FILE, [
    { chord: 'ctrl+x e', action: 'diff:back' },
    { chord: 'ctrl+x 1', action: 'diff:previousSource' },
    { chord: 'ctrl+x d', action: 'diff:nextSource' },
  ])
  if ('error' in merged) throw new Error(merged.error)
  expect(merged.already).toEqual(['ctrl+x e → diff:back'])
  expect(merged.conflicts).toEqual(['ctrl+x 1 is already bound to app:cycleDiffBase'])
  expect(merged.added).toEqual(['ctrl+x d → diff:nextSource'])
  const file = JSON.parse(merged.text)
  expect(file.bindings[0].bindings).toEqual({ 'ctrl+x e': 'diff:back', 'ctrl+x 1': 'app:cycleDiffBase', 'ctrl+x d': 'diff:nextSource' })
  expect(file.bindings[1]).toEqual({ context: 'DiffDialog', bindings: { q: 'diff:nextSource' } })
})

test('a file that is not plain JSON is refused, never overwritten', () => {
  const merged = mergeBindings('{ // a comment\n "bindings": [] }', [{ chord: 'ctrl+x e', action: 'diff:back' }])
  expect('error' in merged).toBe(true)
})
