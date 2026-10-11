import { expect, test } from 'claude-code/testing'

import { parseIgnored, parseNumstat, parseStatus, stateOf } from './git'

const NUL = '\0'

const STATUS = [
  '# branch.oid abcdef1234567890',
  '# branch.head codex/system-discovery',
  '# branch.upstream origin/codex/system-discovery',
  '# branch.ab +1 -2',
  '1 .M N... 100644 100644 100644 aaaa bbbb README.md',
  '1 M. N... 100644 100644 100644 aaaa bbbb skills/x.md',
  '1 A. N... 000000 100644 100644 0000 cccc new.md',
  '1 .D N... 100644 100644 000000 aaaa aaaa gone.md',
  '2 R. N... 100644 100644 100644 aaaa aaaa R100 docs/new name.md',
  'docs/old.md',
  'u UU N... 100644 100644 100644 100644 a b c conflict.md',
  '? plugins/tree/docs/PRD.md',
].join(NUL) + NUL

test('porcelain v2 with -z: branch, ahead/behind, every state, renames and paths with spaces', () => {
  const s = parseStatus(STATUS)
  expect(s.branch).toBe('codex/system-discovery')
  expect(s.ahead).toBe(1)
  expect(s.behind).toBe(2)
  expect(s.files).toEqual({
    'README.md': 'modified',
    'skills/x.md': 'staged',
    'new.md': 'added',
    'gone.md': 'deleted',
    'docs/new name.md': 'renamed',
    'conflict.md': 'conflicted',
    'plugins/tree/docs/PRD.md': 'untracked',
  })
})

test('folder counts climb every ancestor up to the root', () => {
  const s = parseStatus(STATUS)
  expect(s.dirCounts['']).toBe(7)
  expect(s.dirCounts['plugins']).toBe(1)
  expect(s.dirCounts['plugins/tree']).toBe(1)
  expect(s.dirCounts['plugins/tree/docs']).toBe(1)
  expect(s.dirCounts['docs']).toBe(1)
  expect(s.dirCounts['skills']).toBe(1)
})

test('a tree rooted in a subdirectory keeps only paths under its prefix, made relative', () => {
  const s = parseStatus(STATUS, 'skills/')
  expect(s.files).toEqual({ 'x.md': 'staged' })
  expect(s.dirCounts).toEqual({ '': 1 })
})

test('a detached head shows the short commit', () => {
  const s = parseStatus(['# branch.oid 0123456789abcdef', '# branch.head (detached)'].join(NUL) + NUL)
  expect(s.branch).toBe('0123456')
  expect(s.files).toEqual({})
})

test('a repository with no commits yet has no branch name to show', () => {
  const s = parseStatus(['# branch.oid (initial)', '# branch.head main'].join(NUL) + NUL)
  expect(s.branch).toBe('main')
})

test('XY codes: worktree changes win over staged ones', () => {
  expect(stateOf('.M')).toBe('modified')
  expect(stateOf('MM')).toBe('modified')
  expect(stateOf('AM')).toBe('modified')
  expect(stateOf('M.')).toBe('staged')
  expect(stateOf('A.')).toBe('added')
  expect(stateOf('D.')).toBe('deleted')
  expect(stateOf('.D')).toBe('deleted')
  expect(stateOf('R.')).toBe('renamed')
  expect(stateOf('.T')).toBe('modified')
})

test('numstat with -z: counts per path, renames by their new name, binaries flagged, prefix trimmed', () => {
  const out = ['3\t1\tREADME.md', '-\t-\timg/logo.png', '12\t0\t', 'docs/old.md', 'docs/new name.md', '2\t2\tskills/x.md'].join(NUL) + NUL
  expect(parseNumstat(out)).toEqual({
    'README.md': { added: 3, removed: 1, isBinary: false },
    'img/logo.png': { added: 0, removed: 0, isBinary: true },
    'docs/new name.md': { added: 12, removed: 0, isBinary: false },
    'skills/x.md': { added: 2, removed: 2, isBinary: false },
  })
  expect(parseNumstat(out, 'skills/')).toEqual({ 'x.md': { added: 2, removed: 2, isBinary: false } })
})

test('ignored listing splits on NUL and keeps the trailing slash on folders', () => {
  expect(parseIgnored(`node_modules/${NUL}dist/${NUL}.env${NUL}`)).toEqual(['node_modules/', 'dist/', '.env'])
  expect(parseIgnored('')).toEqual([])
})
