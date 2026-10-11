import { expect, test } from 'claude-code/testing'

import { fuzzyFilter, fuzzyMatch } from './find'

const PATHS = ['README.md', 'skills/pattern-design/SKILL.md', 'skills/system-discovery/references/brief-template.md', 'plugins/tree/docs/PRD.md']

test('every query character must appear in order', () => {
  expect(fuzzyMatch('skl', 'skills/a/SKILL.md')).not.toBe(null)
  expect(fuzzyMatch('lks', 'skills/a/SKILL.md')).toBe(null)
  expect(fuzzyMatch('zzz', 'README.md')).toBe(null)
})

test('an empty query matches everything with no highlights', () => {
  expect(fuzzyFilter('', PATHS, 10).map(m => m.path)).toEqual([...PATHS].sort())
  expect(fuzzyMatch('', 'a.md')?.indices).toEqual([])
})

test('boundary hits are preferred, so initials find the file', () => {
  const m = fuzzyMatch('pd', 'skills/pattern-design/SKILL.md')
  expect(m?.indices).toEqual([7, 15])
})

test('a run of consecutive hits beats scattered ones', () => {
  const run = fuzzyMatch('readme', 'README.md')
  const scattered = fuzzyMatch('readme', 'src/reader/models/schema.ts')
  expect(run).not.toBe(null)
  expect(scattered).not.toBe(null)
  expect((run?.score ?? 0) > (scattered?.score ?? 0)).toBe(true)
})

test('the best matches come first and the list is capped', () => {
  const found = fuzzyFilter('prd', PATHS, 2)
  expect(found.length).toBeLessThanOrEqual(2)
  expect(found[0]?.path).toBe('plugins/tree/docs/PRD.md')
  expect(found[0]?.indices, 'the match lands in the file name, not on an earlier p').toEqual([18, 19, 20])
})

test('matching ignores case and spaces in the query', () => {
  expect(fuzzyMatch('SK ILL', 'skills/pattern-design/SKILL.md')).not.toBe(null)
})
