import type { DirListing, TreeEntry } from '../types'
import { baseName, join, parentOf } from './paths'

export type Row = {
  /** 'd:<path>' for a folder, 'f:<path>' for a file: the Button's key */
  key: string
  path: string
  /** the shown name; a compacted chain reads 'a/b/c' */
  name: string
  kind: 'dir' | 'file'
  depth: number
  isOpen: boolean
  /** changed files inside a folded folder */
  count: number
  isIgnored: boolean
  isMissing: boolean
}

export type FlattenOptions = {
  collapsed: ReadonlySet<string>
  /** folders that start folded which the person has opened */
  expanded: ReadonlySet<string>
  /** folder names that start folded (`node_modules`) */
  foldByDefault: ReadonlySet<string>
  /** folder names left out of the tree altogether, as `.git` always is */
  hidden: ReadonlySet<string>
  showIgnored: boolean
  ignored: ReadonlySet<string>
  compactFolders: boolean
  dirCounts: Readonly<Record<string, number>>
  /** files git reports deleted: shown struck through though no longer listed */
  deleted: ReadonlySet<string>
  maxRows: number
  /** focus mode: which paths to keep; a folder not kept is neither shown nor entered */
  keep?: (path: string, kind: 'dir' | 'file') => boolean
}

/** A comma-separated list of folder names: trimmed, slashes stripped, empties dropped. */
export const parseFolderList = (text: string): Set<string> =>
  new Set(text.split(',').map(x => x.trim().replace(/^\/+|\/+$/g, '')).filter(x => x !== ''))

/** Whether a folder of this name is left out of the tree: `.git` always, plus the configured names. */
export const isHiddenName = (name: string, hidden: ReadonlySet<string>): boolean => name === '.git' || hidden.has(name)

export type FoldRules = Pick<FlattenOptions, 'collapsed' | 'expanded' | 'foldByDefault'>

/** Whether a folder shows folded: the person folded it, or it starts folded and they have not opened it. */
export const isDirFolded = (path: string, r: FoldRules): boolean =>
  r.collapsed.has(path) || (r.foldByDefault.has(baseName(path)) && !r.expanded.has(path))

/** Every listed file, tree-relative, sorted: what the filter searches. */
export const allFiles = (dirs: Readonly<Record<string, DirListing>>, hidden: ReadonlySet<string> = new Set()): string[] => {
  const out: string[] = []
  for (const [dir, listing] of Object.entries(dirs)) {
    if (dir.split('/').some(part => isHiddenName(part, hidden))) continue
    for (const en of listing.entries) if (en.kind === 'file') out.push(join(dir, en.name))
  }
  return out.sort()
}

const byName = (a: TreeEntry, b: TreeEntry): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

export function sortEntries(entries: readonly TreeEntry[]): TreeEntry[] {
  const dirs = entries.filter(e => e.kind === 'dir').sort(byName)
  const files = entries.filter(e => e.kind !== 'dir').sort(byName)
  return [...dirs, ...files]
}

/**
 * The rows the pane draws, top to bottom: every listed folder expanded unless
 * the person collapsed it, folders before files at each level. Above
 * `maxRows` the deepest levels start folded (`isFolded`), nothing hidden.
 */
export function flatten(dirs: Readonly<Record<string, DirListing>>, o: FlattenOptions): { rows: Row[]; isFolded: boolean } {
  const deletedByDir = new Map<string, string[]>()
  for (const path of o.deleted) {
    const dir = parentOf(path)
    const list = deletedByDir.get(dir) ?? []
    list.push(path)
    deletedByDir.set(dir, list)
  }

  let maxDepth = 0

  const build = (foldDepth: number): Row[] => {
    const rows: Row[] = []
    const visit = (dir: string, depth: number, inheritedIgnored: boolean) => {
      const listing = dirs[dir]
      if (!listing) return
      const names = new Set(listing.entries.map(e => e.name))
      const extra: TreeEntry[] = (deletedByDir.get(dir) ?? [])
        .map(baseName)
        .filter(name => !names.has(name))
        .map(name => ({ name, kind: 'file' as const }))
      const missing = new Set(extra.map(e => e.name))
      for (const en of sortEntries([...listing.entries, ...extra])) {
        if (en.name === '.git' || (en.kind === 'dir' && o.hidden.has(en.name))) continue
        let path = join(dir, en.name)
        const isIgnored = inheritedIgnored || o.ignored.has(en.kind === 'dir' ? `${path}/` : path)
        if (isIgnored && !o.showIgnored) continue
        if (o.keep && !o.keep(path, en.kind)) continue
        if (en.kind === 'dir') {
          let name = en.name
          if (o.compactFolders) {
            for (;;) {
              if (isDirFolded(path, o)) break
              const child = dirs[path]
              if (!child || child.entries.length !== 1) break
              const only = child.entries[0]
              if (!only || only.kind !== 'dir' || isHiddenName(only.name, o.hidden)) break
              const childPath = join(path, only.name)
              if (!o.showIgnored && o.ignored.has(`${childPath}/`)) break
              if (deletedByDir.has(path)) break
              path = childPath
              name = `${name}/${only.name}`
            }
          }
          maxDepth = Math.max(maxDepth, depth)
          const isOpen = !isDirFolded(path, o) && depth < foldDepth
          rows.push({ key: `d:${path}`, path, name, kind: 'dir', depth, isOpen, count: o.dirCounts[path] ?? 0, isIgnored, isMissing: false })
          if (isOpen) visit(path, depth + 1, isIgnored)
        } else {
          rows.push({ key: `f:${path}`, path, name: en.name, kind: 'file', depth, isOpen: false, count: 0, isIgnored, isMissing: missing.has(en.name) })
        }
      }
    }
    visit('', 0, false)
    return rows
  }

  let rows = build(Number.POSITIVE_INFINITY)
  if (rows.length <= o.maxRows) return { rows, isFolded: false }
  for (let d = maxDepth; d >= 1; d--) {
    rows = build(d)
    if (rows.length <= o.maxRows) return { rows, isFolded: true }
  }
  return { rows: build(1), isFolded: true }
}

/** The folders directly inside `dir`, tree-relative, hidden ones left out: what a walk goes on into. */
export const childDirs = (dir: string, listing: DirListing, hidden: ReadonlySet<string> = new Set()): string[] =>
  listing.entries.filter(en => en.kind === 'dir' && !isHiddenName(en.name, hidden)).map(en => join(dir, en.name))

/** Every listed folder path except the root: what "collapse all" folds. */
export const allDirs = (dirs: Readonly<Record<string, DirListing>>): string[] => Object.keys(dirs).filter(d => d !== '')
