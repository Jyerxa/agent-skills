import type { GitSnapshot, GitState, LineCounts } from '../types'
import { ancestorsOf } from './paths'

export const EMPTY_GIT: GitSnapshot = {
  isRepo: false,
  failed: false,
  branch: null,
  ahead: 0,
  behind: 0,
  files: {},
  dirCounts: {},
  ignored: [],
  numstat: {},
}

/** The paths git reports in `state`. */
export const pathsIn = (files: Readonly<Record<string, GitState>>, state: GitState): string[] =>
  Object.entries(files)
    .filter(([, s]) => s === state)
    .map(([p]) => p)

/** The order the Changes view groups files in, and each group's heading. */
export const GROUPS: readonly { state: GitState; label: string }[] = [
  { state: 'conflicted', label: 'Conflicted' },
  { state: 'modified', label: 'Modified' },
  { state: 'staged', label: 'Staged' },
  { state: 'added', label: 'Added' },
  { state: 'renamed', label: 'Renamed' },
  { state: 'deleted', label: 'Deleted' },
  { state: 'untracked', label: 'Untracked' },
]

/** The state one XY pair of porcelain v2 means for the tree. */
export function stateOf(xy: string): GitState {
  const x = xy[0] ?? '.'
  const y = xy[1] ?? '.'
  if (y === 'D') return 'deleted'
  if (y === 'M' || y === 'T') return 'modified'
  if (x === 'A') return 'added'
  if (x === 'D') return 'deleted'
  if (x === 'R' || x === 'C') return 'renamed'
  if (x === 'M' || x === 'T') return 'staged'
  return 'modified'
}

export type ParsedStatus = Pick<GitSnapshot, 'branch' | 'ahead' | 'behind' | 'files' | 'dirCounts'>

/**
 * Parses `git status --porcelain=v2 -z --branch`. Paths in the output are
 * relative to the repository root; `prefix` is the tree root's path inside the
 * repository ('' at the top, else 'sub/dir/'), and paths outside it are dropped.
 */
export function parseStatus(stdout: string, prefix = ''): ParsedStatus {
  const tokens = stdout.split('\0')
  const files: Record<string, GitState> = {}
  let branch: string | null = null
  let oid = ''
  let ahead = 0
  let behind = 0

  const put = (repoPath: string, state: GitState) => {
    if (prefix && !repoPath.startsWith(prefix)) return
    const rel = repoPath.slice(prefix.length)
    if (rel === '') return
    files[rel] = state
  }

  for (let i = 0; i < tokens.length; i++) {
    const line = tokens[i] ?? ''
    if (line === '') continue
    if (line.startsWith('# ')) {
      const parts = line.slice(2).split(' ')
      const key = parts[0]
      if (key === 'branch.head') branch = parts[1] === '(detached)' ? null : (parts[1] ?? null)
      else if (key === 'branch.oid') oid = parts[1] ?? ''
      else if (key === 'branch.ab') {
        ahead = Number(parts[1]?.slice(1) ?? 0) || 0
        behind = Number(parts[2]?.slice(1) ?? 0) || 0
      }
      continue
    }
    const kind = line[0]
    const fields = line.split(' ')
    if (kind === '1') {
      put(fields.slice(8).join(' '), stateOf(fields[1] ?? ''))
    } else if (kind === '2') {
      const xy = fields[1] ?? ''
      put(fields.slice(9).join(' '), xy.includes('R') || xy.includes('C') ? 'renamed' : stateOf(xy))
      i++ // with -z the original path follows as its own token
    } else if (kind === 'u') {
      put(fields.slice(10).join(' '), 'conflicted')
    } else if (kind === '?') {
      put(line.slice(2), 'untracked')
    }
  }

  if (branch === null && oid && oid !== '(initial)') branch = oid.slice(0, 7)

  const dirCounts: Record<string, number> = {}
  for (const rel of Object.keys(files)) {
    for (const dir of ancestorsOf(rel)) dirCounts[dir] = (dirCounts[dir] ?? 0) + 1
  }

  return { branch, ahead, behind, files, dirCounts }
}

/** Parses `git ls-files -z --others --ignored --exclude-standard --directory`. */
export function parseIgnored(stdout: string): string[] {
  return stdout.split('\0').filter(s => s !== '')
}

/**
 * Parses `git diff --numstat -z`: `added TAB removed TAB path NUL`, a rename
 * as `added TAB removed TAB NUL old NUL new NUL`, a binary file as `- TAB -`.
 * Paths are repository-relative; `prefix` trims them to the tree root.
 */
export function parseNumstat(stdout: string, prefix = ''): Record<string, LineCounts> {
  const out: Record<string, LineCounts> = {}
  const tokens = stdout.split('\0')
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] ?? ''
    if (t === '') continue
    const m = /^(\d+|-)\t(\d+|-)\t([\s\S]*)$/.exec(t)
    if (!m) continue
    const added = m[1] === '-' ? 0 : Number(m[1])
    const removed = m[2] === '-' ? 0 : Number(m[2])
    let path = m[3] ?? ''
    if (path === '') {
      i += 2 // a rename: the old path, then the new one
      path = tokens[i] ?? ''
    }
    if (prefix && !path.startsWith(prefix)) continue
    const rel = path.slice(prefix.length)
    if (rel) out[rel] = { added, removed, isBinary: m[1] === '-' }
  }
  return out
}
