import { expect, test } from 'claude-code/testing'

import type { DirListing } from '../types'
import { ancestorsOf, relativeTo, shortenPath, truncateMiddle, truncateStart } from './paths'
import { allDirs, allFiles, childDirs, flatten, isDirFolded, parseFolderList, type FlattenOptions } from './tree'

const d = (names: string[]): DirListing => ({
  entries: names.map(n => (n.endsWith('/') ? { name: n.slice(0, -1), kind: 'dir' as const } : { name: n, kind: 'file' as const })),
})

const REPO: Record<string, DirListing> = {
  '': d(['skills/', 'plugins/', '.git/', 'README.md', 'LICENSE']),
  skills: d(['system-discovery/', 'pattern-design/']),
  'skills/pattern-design': d(['references/', 'fixtures/', 'SKILL.md']),
  'skills/pattern-design/fixtures': d(['brewhub-prd.md', 'brewhub-prd.ANSWER-KEY.md']),
  'skills/pattern-design/references': d(['catalogs/', 'templates.md', 'catalog-schema.md']),
  'skills/pattern-design/references/catalogs': d(['gof.md']),
  'skills/system-discovery': d(['references/', 'SKILL.md']),
  'skills/system-discovery/references': d(['brief-template.md']),
  plugins: d(['tree/']),
  'plugins/tree': d(['docs/']),
  'plugins/tree/docs': d(['PRD.md']),
}

const base = (over: Partial<FlattenOptions> = {}): FlattenOptions => ({
  collapsed: new Set(),
  expanded: new Set(),
  foldByDefault: new Set(),
  hidden: new Set(),
  showIgnored: false,
  ignored: new Set(),
  compactFolders: true,
  dirCounts: {},
  deleted: new Set(),
  maxRows: 2000,
  ...over,
})

test('everything expanded: folders before files at each level, sorted, .git hidden', () => {
  const { rows, isFolded } = flatten(REPO, base({ compactFolders: false }))
  expect(isFolded).toBe(false)
  expect(rows.map(r => `${'  '.repeat(r.depth)}${r.kind === 'dir' ? (r.isOpen ? '▾ ' : '▸ ') : ''}${r.name}`)).toEqual([
    '▾ plugins',
    '  ▾ tree',
    '    ▾ docs',
    '      PRD.md',
    '▾ skills',
    '  ▾ pattern-design',
    '    ▾ fixtures',
    '      brewhub-prd.ANSWER-KEY.md',
    '      brewhub-prd.md',
    '    ▾ references',
    '      ▾ catalogs',
    '        gof.md',
    '      catalog-schema.md',
    '      templates.md',
    '    SKILL.md',
    '  ▾ system-discovery',
    '    ▾ references',
    '      brief-template.md',
    '    SKILL.md',
    'LICENSE',
    'README.md',
  ])
  expect(rows.find(r => r.name === '.git')).toBeUndefined()
})

test('compact folders join single-child chains on one row, keyed by the deepest folder', () => {
  const { rows } = flatten(REPO, base())
  const chain = rows.find(r => r.name === 'plugins/tree/docs')
  expect(chain).toBeDefined()
  expect(chain?.key).toBe('d:plugins/tree/docs')
  expect(rows.find(r => r.key === 'f:plugins/tree/docs/PRD.md')?.depth).toBe(1)
  // system-discovery holds two entries, so it is no chain
  expect(rows.find(r => r.key === 'd:skills/system-discovery')?.name).toBe('system-discovery')
})

test('a collapsed folder hides its children and shows the count of changes inside', () => {
  const { rows } = flatten(REPO, base({ collapsed: new Set(['skills']), dirCounts: { '': 3, skills: 2 } }))
  const skills = rows.find(r => r.key === 'd:skills')
  expect(skills?.isOpen).toBe(false)
  expect(skills?.count).toBe(2)
  expect(rows.find(r => r.key === 'f:skills/pattern-design/SKILL.md')).toBeUndefined()
})

test('ignored entries are hidden by default and dim when shown', () => {
  const dirs = { ...REPO, '': d(['skills/', 'node_modules/', 'README.md', 'out.log']), node_modules: d(['x/']) }
  const ignored = new Set(['node_modules/', 'out.log'])
  const hidden = flatten(dirs, base({ ignored, compactFolders: false })).rows
  expect(hidden.find(r => r.key === 'd:node_modules')).toBeUndefined()
  expect(hidden.find(r => r.key === 'f:out.log')).toBeUndefined()
  const shown = flatten(dirs, base({ ignored, showIgnored: true, compactFolders: false })).rows
  expect(shown.find(r => r.key === 'd:node_modules')?.isIgnored).toBe(true)
  expect(shown.find(r => r.key === 'd:node_modules/x')?.isIgnored).toBe(true)
  expect(shown.find(r => r.key === 'f:out.log')?.isIgnored).toBe(true)
})

test('a file git reports deleted stays in the tree, marked missing', () => {
  const { rows } = flatten(REPO, base({ deleted: new Set(['skills/gone.md']) }))
  const gone = rows.find(r => r.key === 'f:skills/gone.md')
  expect(gone?.isMissing).toBe(true)
  expect(rows.find(r => r.key === 'f:README.md')?.isMissing).toBe(false)
})

test('above the row cap the deepest levels fold and nothing is dropped', () => {
  const { rows, isFolded } = flatten(REPO, base({ compactFolders: false, maxRows: 10 }))
  expect(isFolded).toBe(true)
  expect(rows.length).toBeLessThanOrEqual(10)
  expect(rows.find(r => r.key === 'd:skills')?.isOpen).toBe(true)
  expect(rows.find(r => r.key === 'd:skills/pattern-design')?.isOpen).toBe(false)
})

test('focus mode keeps only the paths in play and the folders that lead to them', () => {
  const inPlay = new Set(['skills/pattern-design/SKILL.md', 'README.md'])
  const keepDirs = new Set(['', 'skills', 'skills/pattern-design'])
  const { rows } = flatten(REPO, base({ compactFolders: false, keep: (path, kind) => (kind === 'dir' ? keepDirs.has(path) : inPlay.has(path)) }))
  expect(rows.map(r => r.key)).toEqual(['d:skills', 'd:skills/pattern-design', 'f:skills/pattern-design/SKILL.md', 'f:README.md'])
})

test('allFiles lists every listed file, sorted, for the filter to search', () => {
  const files = allFiles(REPO)
  expect(files[0]).toBe('LICENSE')
  expect(files).toContain('skills/pattern-design/references/catalogs/gof.md')
  expect(files).toHaveLength(11)
})

test('allDirs lists every listed folder except the root', () => {
  expect(allDirs(REPO)).not.toContain('')
  expect(allDirs(REPO)).toContain('skills/pattern-design/references/catalogs')
})

test('tool paths become tree-relative on Windows and POSIX, or null outside the root', () => {
  expect(relativeTo('C:\\Users\\j\\repo', 'C:\\Users\\j\\repo\\src\\a.ts')).toBe('src/a.ts')
  expect(relativeTo('C:/Users/j/repo', 'c:/users/j/repo/src/a.ts')).toBe('src/a.ts')
  expect(relativeTo('C:\\Users\\j\\repo', 'C:\\Users\\j\\other\\a.ts')).toBe(null)
  expect(relativeTo('/home/j/repo', '/home/j/repo/src/a.ts')).toBe('src/a.ts')
  expect(relativeTo('/home/j/repo', '/home/j/repo')).toBe('')
  expect(relativeTo('/home/j/repo', '/home/j/repository/a.ts')).toBe(null)
  expect(relativeTo('/home/j/repo', 'src/a.ts')).toBe('src/a.ts')
  expect(relativeTo('/home/j/repo', './src/a.ts')).toBe('src/a.ts')
})

test('ancestors run from the root down to the parent', () => {
  expect(ancestorsOf('a/b/c.ts')).toEqual(['', 'a', 'a/b'])
  expect(ancestorsOf('c.ts')).toEqual([''])
})

test('long paths show the home as ~ and elide the middle, keeping the first folder and the file name', () => {
  const p = 'C:/Users/j/.claude/dev-mods/abc/tree/README.md'
  expect(shortenPath(p, 40, 'C:\\Users\\j')).toBe('~/.claude/dev-mods/abc/tree/README.md')
  expect(shortenPath(p, 30, 'C:\\Users\\j')).toBe('~/…/abc/tree/README.md')
  expect(shortenPath(p, 12, 'C:\\Users\\j')).toBe('…/README.md')
  expect(shortenPath('skills/pattern-design/references/catalogs/gof.md', 24)).toBe('skills/…/catalogs/gof.md')
  expect(shortenPath('/elsewhere/notes.md', 40, '/home/j')).toBe('/elsewhere/notes.md')
  expect(shortenPath('/home/j/notes.md', 40, '/home/j')).toBe('~/notes.md')
})

test('truncation keeps both ends, or the file name', () => {
  expect(truncateMiddle('brewhub-prd.ANSWER-KEY.md', 22)).toBe('brewhub-pr…SWER-KEY.md')
  expect(truncateMiddle('short.md', 22)).toBe('short.md')
  expect(truncateMiddle('abc', 1)).toBe('…')
  expect(truncateStart('skills/pattern-design/SKILL.md', 12)).toBe('…gn/SKILL.md')
})

const MODULES: Record<string, DirListing> = {
  '': d(['src/', 'node_modules/', 'README.md']),
  src: d(['a.ts']),
  node_modules: d(['left-pad/', 'is-odd/']),
  'node_modules/left-pad': d(['index.js']),
  'node_modules/is-odd': d(['index.js']),
}

const show = (rows: { depth: number; isOpen: boolean; kind: string; name: string }[]) =>
  rows.map(r => `${'  '.repeat(r.depth)}${r.kind === 'dir' ? (r.isOpen ? '▾ ' : '▸ ') : ''}${r.name}`)

test('a folder that starts folded shows folded, with its change count, and its contents are not drawn', () => {
  const { rows } = flatten(MODULES, base({ foldByDefault: new Set(['node_modules']), dirCounts: { node_modules: 2 } }))
  expect(show(rows)).toEqual(['▸ node_modules', '▾ src', '  a.ts', 'README.md'])
  expect(rows.find(r => r.name === 'node_modules')?.count).toBe(2)
})

test('opening a folder that starts folded draws it; an explicit fold still wins', () => {
  const fold = new Set(['node_modules'])
  expect(show(flatten(MODULES, base({ foldByDefault: fold, expanded: new Set(['node_modules']) })).rows)).toEqual([
    '▾ node_modules',
    '  ▾ is-odd',
    '    index.js',
    '  ▾ left-pad',
    '    index.js',
    '▾ src',
    '  a.ts',
    'README.md',
  ])
  const rows = flatten(MODULES, base({ foldByDefault: fold, expanded: new Set(['node_modules']), collapsed: new Set(['node_modules']) })).rows
  expect(rows.find(r => r.name === 'node_modules')?.isOpen).toBe(false)
})

test('compaction does not run through a folder that starts folded', () => {
  const dirs: Record<string, DirListing> = { '': d(['node_modules/']), node_modules: d(['only/']), 'node_modules/only': d(['x.js']) }
  expect(show(flatten(dirs, base({ foldByDefault: new Set(['node_modules']) })).rows)).toEqual(['▸ node_modules'])
  const open = flatten(dirs, base({ foldByDefault: new Set(['node_modules']), expanded: new Set(['node_modules']) })).rows
  expect(show(open)).toEqual(['▾ node_modules/only', '  x.js'])
})

test('a folder that starts folded is matched by name at any depth', () => {
  const r = { collapsed: new Set<string>(), expanded: new Set<string>(), foldByDefault: new Set(['node_modules']) }
  expect(isDirFolded('node_modules', r)).toBe(true)
  expect(isDirFolded('packages/app/node_modules', r)).toBe(true)
  expect(isDirFolded('packages/app', r)).toBe(false)
  expect(isDirFolded('packages/app/node_modules', { ...r, expanded: new Set(['packages/app/node_modules']) })).toBe(false)
})

test('hidden folders get no row, are not entered by compaction, not searched, and not walked', () => {
  const hidden = new Set(['node_modules', 'src'])
  expect(show(flatten(MODULES, base({ hidden })).rows)).toEqual(['README.md'])
  const dirs: Record<string, DirListing> = { '': d(['a/']), a: d(['dist/']), 'a/dist': d(['x.js']) }
  expect(show(flatten(dirs, base({ hidden: new Set(['dist']) })).rows)).toEqual(['▾ a'])
  expect(allFiles(MODULES, hidden)).toEqual(['README.md'])
  expect(allFiles(MODULES).length).toBe(4)
  expect(childDirs('', MODULES[''] as DirListing, hidden)).toEqual([])
  expect(childDirs('', MODULES[''] as DirListing)).toEqual(['src', 'node_modules'])
})

test('a hidden name hides folders only: a file of that name is still a file', () => {
  const dirs: Record<string, DirListing> = { '': d(['dist', 'README.md']) }
  expect(show(flatten(dirs, base({ hidden: new Set(['dist']) })).rows)).toEqual(['dist', 'README.md'])
})

test('parseFolderList trims, strips slashes and drops empties', () => {
  expect([...parseFolderList(' node_modules, dist/ ,, /vendor/ ')]).toEqual(['node_modules', 'dist', 'vendor'])
  expect(parseFolderList('').size).toBe(0)
})
