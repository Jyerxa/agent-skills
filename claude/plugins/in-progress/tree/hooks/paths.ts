/** Path helpers: everything inside the plugin is a forward-slash, tree-relative path. */

export const toPosix = (p: string): string => p.replace(/\\/g, '/')

export const isWindowsPath = (p: string): boolean => /^[A-Za-z]:\//.test(p)

export const isAbsolute = (p: string): boolean => p.startsWith('/') || isWindowsPath(p)

export const normalizeRoot = (root: string): string => toPosix(root).replace(/\/+$/, '')

/** The absolute path of a tree-relative one ('' is the root itself); an absolute path is kept. */
export const absoluteOf = (root: string, path: string): string => (isAbsolute(path) ? path : path ? `${root}/${path}` : root)

const trimDots = (p: string): string => p.replace(/^(\.\/)+/, '').replace(/\/+$/, '')

/**
 * The tree-relative path of a tool's `file_path`, or null when it lies outside
 * the root. A relative input is taken as relative to the root. On a Windows
 * root the comparison ignores case.
 */
export function relativeTo(root: string, filePath: string): string | null {
  const r = normalizeRoot(root)
  const p = toPosix(filePath).replace(/\/+$/, '')
  if (!isAbsolute(p)) return trimDots(p)
  const ignoreCase = isWindowsPath(r)
  const a = ignoreCase ? p.toLowerCase() : p
  const b = ignoreCase ? r.toLowerCase() : r
  if (a === b) return ''
  if (!a.startsWith(b + '/')) return null
  return p.slice(r.length + 1)
}

export const parentOf = (rel: string): string => {
  const i = rel.lastIndexOf('/')
  return i < 0 ? '' : rel.slice(0, i)
}

export const baseName = (p: string): string => {
  const s = toPosix(p).replace(/\/+$/, '')
  return s.slice(s.lastIndexOf('/') + 1)
}

export const join = (dir: string, name: string): string => (dir ? `${dir}/${name}` : name)

/** The directories above `rel`: '' (the root) first, then each level down to its parent. */
export function ancestorsOf(rel: string): string[] {
  const out: string[] = ['']
  let acc = ''
  for (const part of rel.split('/').slice(0, -1)) {
    acc = acc ? `${acc}/${part}` : part
    out.push(acc)
  }
  return out
}

export const cells = (s: string): number => [...s].length

/** Cuts the middle of `s` with an ellipsis so it fits `width` cells. */
export function truncateMiddle(s: string, width: number): string {
  const chars = [...s]
  if (width <= 0) return ''
  if (chars.length <= width) return s
  if (width === 1) return '…'
  const keep = width - 1
  const head = Math.floor(keep / 2)
  const tail = keep - head
  return chars.slice(0, head).join('') + '…' + chars.slice(chars.length - tail).join('')
}

/**
 * `path` for display within `width` cells: the home folder as `~`; when it
 * still does not fit, the middle folders give way to `…` while the first
 * folder and the file name stay, so `~/.claude/dev-mods/…/tree/README.md`.
 */
export function shortenPath(path: string, width: number, home = ''): string {
  let p = toPosix(path)
  const h = normalizeRoot(home)
  if (h) {
    const ignoreCase = isWindowsPath(h)
    const a = ignoreCase ? p.toLowerCase() : p
    const b = ignoreCase ? h.toLowerCase() : h
    if (a === b) p = '~'
    else if (a.startsWith(`${b}/`)) p = `~${p.slice(h.length)}`
  }
  if (cells(p) <= width) return p
  const parts = p.split('/')
  const file = parts[parts.length - 1] ?? ''
  if (parts.length <= 2) return truncateStart(p, width)
  const first = parts[0] ?? ''
  const middle = parts.slice(1, -1)
  for (let keep = middle.length - 1; keep >= 0; keep--) {
    const candidate = [first, '…', ...middle.slice(middle.length - keep), file].join('/')
    if (cells(candidate) <= width) return candidate
  }
  return truncateStart(`…/${file}`, width)
}

/** Cuts the start of `s` with an ellipsis so it fits `width` cells (keeps the file name). */
export function truncateStart(s: string, width: number): string {
  const chars = [...s]
  if (width <= 0) return ''
  if (chars.length <= width) return s
  if (width === 1) return '…'
  return '…' + chars.slice(chars.length - (width - 1)).join('')
}
