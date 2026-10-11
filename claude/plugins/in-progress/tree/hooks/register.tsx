import { atom, read, update } from 'claude-code'
import type { Color, EngineInterface, Hook, PluginOptions, Register, RenderElement, RenderInput, Timer } from 'claude-code'

import type { ActiveFile, DirListing, FoldAnim, GitSnapshot, GitState, LineCounts, PaneView } from '../types'
import { isDone, rowPhase, stepFor } from './anim'
import { CLAUDE_ACCENT, glowTints, parseHex } from './color'
import { fuzzyFilter } from './find'
import { EMPTY_GIT, GROUPS, parseIgnored, parseNumstat, parseStatus } from './git'
import { ancestorsOf, baseName, cells, join, normalizeRoot, parentOf, relativeTo, shortenPath, toPosix, truncateMiddle, truncateStart } from './paths'
import { allDirs, allFiles, flatten, type Row } from './tree'

const PANE = 'tree'
const FLUSH_EVERY = 25
const POLL_IDLE_MS = 20_000
const POLL_TURN_MS = 3_000
const SHIMMER_MS = 100
const SHIMMER_WINDOW = 3
const TRAIL_TICK_MS = 5_000
const TRAIL_FADE_MS = 130_000
const REFRESH_DEBOUNCE_MS = 300
const SLOW_STATUS_MS = 500
const SCROLL_GRACE_MS = 5_000
const LEGEND_GAP = 2
/** one cell of breathing room on each side of the body, and one blank row under the header and above the legend (the cue rows) */
const PAD_X = 1
const PAD_ROWS = 2
const FILTER_MAX = 200
const PEEK_MAX_LINES = 5000
const UNTRACKED_COUNT_MAX = 100
/** how long the "last:" line lingers after Claude closes a file */
const LAST_LINGER_MS = 8_000
/** how long the glow takes to fade once the edit ends, and how long the shimmer clock keeps ticking to draw that fade */
const GLOW_FADE_MS = 500
const SHIMMER_TAIL_MS = 600
/** the fold ripple's frame */
const ANIM_FRAME_MS = 33
/** the breathing glyph's frames, one per three shimmer ticks */
const BREATH = ['●', '◉', '○']

// ---------- session state, held by the engine (survives a hot reload); declared in ../types ----------

const rootAtom = atom({ plugin: 'tree', key: 'root' } as const, '')
const dirsAtom = atom({ plugin: 'tree', key: 'dirs' } as const, {} as Record<string, DirListing>)
const collapsedAtom = atom({ plugin: 'tree', key: 'collapsed' } as const, [] as string[])
const gitAtom = atom({ plugin: 'tree', key: 'git' } as const, EMPTY_GIT)
const activeAtom = atom({ plugin: 'tree', key: 'active' } as const, [] as ActiveFile[])
const trailAtom = atom({ plugin: 'tree', key: 'trail' } as const, {} as Record<string, number>)
const phaseAtom = atom({ plugin: 'tree', key: 'phase' } as const, 0)
const tickAtom = atom({ plugin: 'tree', key: 'tick' } as const, 0)
const showIgnoredAtom = atom({ plugin: 'tree', key: 'showIgnored' } as const, false)
const closedByHandAtom = atom({ plugin: 'tree', key: 'closedByHand' } as const, false)
const walkDoneAtom = atom({ plugin: 'tree', key: 'walkDone' } as const, false)
const offsetAtom = atom({ plugin: 'tree', key: 'offset' } as const, 0)
const viewAtom = atom({ plugin: 'tree', key: 'view' } as const, 'tree' as PaneView)
const filterAtom = atom({ plugin: 'tree', key: 'filter' } as const, null as string | null)
const focusModeAtom = atom({ plugin: 'tree', key: 'focusMode' } as const, false)
const peekAtom = atom({ plugin: 'tree', key: 'peek' } as const, null as string | null)
const peekDiffAtom = atom({ plugin: 'tree', key: 'peekDiff' } as const, '')
const focusedAtom = atom({ plugin: 'tree', key: 'focused' } as const, null as string | null)
const animAtom = atom({ plugin: 'tree', key: 'anim' } as const, null as FoldAnim | null)
const frameAtom = atom({ plugin: 'tree', key: 'frame' } as const, 0)

export type Config = {
  side: 'left' | 'right'
  columns: number
  openOnStart: boolean
  followClaude: boolean
  readsShimmer: boolean
  shimmer: 'sweep' | 'pulse' | 'off'
  showIgnored: boolean
  compactFolders: boolean
  maxRows: number
  accent: string
  glow: boolean
  animate: boolean
}

type Dollar = Pick<EngineInterface, 'state' | 'fs' | 'process' | 'clock' | 'ui' | 'store' | 'session' | 'prompt' | 'config' | 'command' | 'env'>
type StateDollar = Pick<EngineInterface, 'state'>
type RenderDollar = Parameters<Hook<'ui.render'>>[0]

// ---------- module state: lost on a hot reload, which is fine; everything a draw needs is in $.state ----------

let cfg: Config = readConfig({})
let pollTimer: Timer | undefined
let shimmerTimer: Timer | undefined
let trailTimer: Timer | undefined
let refreshTimer: Timer | undefined
let pendingDirs = new Set<string>()
let isTurnRunning = false
let lastPersonScrollAt = 0
let walkGeneration = 0
let fullWalk: Promise<void> | undefined
let untrackedMode: 'all' | 'normal' = 'all'
/** rows the pane showed at its last draw, and where it was seated: what scrolling and reveal size themselves to */
let lastVisible = 20
let lastPlacement: 'dock' | 'inline' = 'dock'
/** the person's home folder, shown as `~` in long paths */
let homeDir = ''
/** whether the person's theme is a light one: picks the glow palette */
let isLightTheme = false
/** when Claude last closed a file: the glow fades for a moment after */
let lastEndedAt = 0
let animTimer: Timer | undefined

function readConfig(o: PluginOptions): Config {
  return {
    side: o['side'] === 'right' ? 'right' : 'left',
    columns: typeof o['columns'] === 'number' && o['columns'] > 0 ? Math.floor(o['columns']) : 32,
    openOnStart: o['openOnStart'] !== false,
    followClaude: o['followClaude'] !== false,
    readsShimmer: o['readsShimmer'] !== false,
    shimmer: o['shimmer'] === 'pulse' ? 'pulse' : o['shimmer'] === 'off' ? 'off' : 'sweep',
    showIgnored: o['showIgnored'] === true,
    compactFolders: o['compactFolders'] !== false,
    maxRows: 2000,
    accent: typeof o['accent'] === 'string' && parseHex(o['accent']) ? o['accent'] : CLAUDE_ACCENT,
    glow: o['glow'] !== false,
    animate: o['animate'] !== false,
  }
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi)

const isAbsolute = (p: string): boolean => p.startsWith('/') || /^[A-Za-z]:\//.test(p)

// ---------- git ----------

/** Lines in a text file, or null for a binary or unreadable one. */
const countLines = async ($: Dollar, abs: string): Promise<number | null> => {
  try {
    const text = await $.fs.read(abs)
    if (text.includes('\0')) return null
    if (text === '') return 0
    return text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
  } catch {
    return null
  }
}

const readGit = async ($: Dollar, root: string, withCounts: boolean): Promise<GitSnapshot> => {
  const at = await $.clock.now()
  try {
    const top = await $.process.run(['git', 'rev-parse', '--show-prefix'], { cwd: root, timeoutMs: 10_000 })
    if (top.exitCode !== 0) return { ...EMPTY_GIT, at }
    const prefix = toPosix(top.stdout.trim())
    const [status, ignored] = await Promise.all([
      $.process.run(['git', 'status', '--porcelain=v2', '-z', '--branch', `--untracked-files=${untrackedMode}`], { cwd: root, timeoutMs: 20_000 }),
      $.process.run(['git', 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'], { cwd: root, timeoutMs: 20_000 }),
    ])
    const took = (await $.clock.now()) - at
    if (took > SLOW_STATUS_MS) untrackedMode = 'normal'
    if (status.exitCode !== 0) return { ...(await read($, gitAtom)), isRepo: true, failed: true, at }
    const parsed = parseStatus(status.stdout, prefix)
    let numstat: Record<string, LineCounts> = {}
    if (withCounts) {
      const ns = await $.process.run(['git', 'diff', 'HEAD', '--numstat', '-z'], { cwd: root, timeoutMs: 20_000 })
      if (ns.exitCode === 0) numstat = parseNumstat(ns.stdout, prefix)
      const untracked = Object.entries(parsed.files)
        .filter(([, s]) => s === 'untracked')
        .slice(0, UNTRACKED_COUNT_MAX)
      for (const [path] of untracked) {
        const n = await countLines($, `${root}/${path}`)
        numstat[path] = n === null ? { added: 0, removed: 0, isBinary: true } : { added: n, removed: 0, isBinary: false }
      }
    }
    return {
      isRepo: true,
      failed: false,
      at,
      ...parsed,
      ignored: ignored.exitCode === 0 ? parseIgnored(ignored.stdout) : [],
      numstat,
    }
  } catch {
    return { ...(await read($, gitAtom)), failed: true, at }
  }
}

/** The unified diff of one changed file against HEAD; an untracked file is diffed against nothing. */
const readDiff = async ($: Dollar, root: string, path: string, state: GitState | undefined): Promise<string> => {
  const argv = state === 'untracked' ? ['git', 'diff', '--no-index', '--', '/dev/null', path] : ['git', 'diff', 'HEAD', '--', path]
  try {
    const ran = await $.process.run(argv, { cwd: root, timeoutMs: 20_000 })
    return ran.stdout.split('\n').slice(0, PEEK_MAX_LINES).join('\n')
  } catch {
    return ''
  }
}

// ---------- walking the tree ----------

const listDir = async ($: Dollar, root: string, rel: string): Promise<DirListing | undefined> => {
  const abs = rel ? `${root}/${rel}` : root
  try {
    const entries = await $.fs.list(abs)
    let mtimeMs = 0
    try {
      mtimeMs = (await $.fs.stat(abs)).mtimeMs
    } catch {
      // the directory vanished between the list and the stat: keep 0
    }
    return {
      entries: entries.map(x => ({ name: x.name, kind: x.kind === 'dir' ? ('dir' as const) : ('file' as const) })),
      mtimeMs,
    }
  } catch {
    return undefined
  }
}

/** Lists `start` and everything beneath it (ignored folders only when `walkIgnored`), writing in batches. */
const walk = async ($: Dollar, root: string, start: string, walkIgnored: boolean): Promise<void> => {
  const generation = walkGeneration
  const ignored = new Set((await read($, gitAtom)).ignored)
  const queue: string[] = [start]
  let batch: Record<string, DirListing> = {}
  let seen = 0
  const flush = async () => {
    if (Object.keys(batch).length === 0) return
    const chunk = batch
    batch = {}
    await update($, dirsAtom, all => ({ ...all, ...chunk }))
  }
  while (queue.length > 0) {
    if (generation !== walkGeneration) return
    const rel = queue.shift() as string
    const listing = await listDir($, root, rel)
    if (!listing) continue
    batch[rel] = listing
    for (const en of listing.entries) {
      if (en.kind !== 'dir' || en.name === '.git') continue
      const child = join(rel, en.name)
      if (!walkIgnored && ignored.has(`${child}/`)) continue
      queue.push(child)
    }
    seen++
    if (rel === start || seen % FLUSH_EVERY === 0) await flush()
  }
  await flush()
  if (start === '') await update($, walkDoneAtom, () => true)
}

/** The one full walk in flight, shared: a second ask joins it instead of starting over. */
const walkAll = ($: Dollar, root: string): Promise<void> => {
  if (!fullWalk) {
    fullWalk = walk($, root, '', false).finally(() => {
      fullWalk = undefined
    })
  }
  return fullWalk
}

/** Re-lists the folders git says gained or lost files, plus any `extra`, and walks folders that are new. */
const reconcile = async ($: Dollar, root: string, extra: Iterable<string>): Promise<void> => {
  const dirs = await read($, dirsAtom)
  const git = await read($, gitAtom)
  const todo = new Set<string>(extra)
  for (const [path, state] of Object.entries(git.files)) {
    const dir = parentOf(path)
    const listing = dirs[dir]
    if (!listing) {
      for (const anc of ancestorsOf(path)) if (!dirs[anc]) todo.add(parentOf(anc))
      continue
    }
    const name = path.slice(dir ? dir.length + 1 : 0)
    const has = listing.entries.some(e => e.name === name)
    if ((state === 'untracked' || state === 'added') && !has) todo.add(dir)
    if (state === 'deleted' && has) todo.add(dir)
  }
  for (const dir of todo) {
    if (dir !== '' && !dirs[parentOf(dir)]) continue
    const listing = await listDir($, root, dir)
    if (!listing) {
      await update($, dirsAtom, all => {
        const next = { ...all }
        for (const key of Object.keys(next)) if (key === dir || key.startsWith(`${dir}/`)) delete next[key]
        return next
      })
      continue
    }
    await update($, dirsAtom, all => ({ ...all, [dir]: listing }))
    const known = await read($, dirsAtom)
    for (const en of listing.entries) {
      if (en.kind !== 'dir' || en.name === '.git') continue
      const child = join(dir, en.name)
      if (!known[child]) void walk($, root, child, false)
    }
  }
}

const refresh = async ($: Dollar, opts: { walk: boolean; dirs?: Iterable<string> }): Promise<void> => {
  const root = normalizeRoot(await $.session.root())
  const previous = await read($, rootAtom)
  let shouldWalk = opts.walk
  if (root !== previous) {
    walkGeneration++ // any walk of the old root stops at its next step
    await update($, rootAtom, () => root)
    await update($, dirsAtom, () => ({}))
    await update($, walkDoneAtom, () => false)
    await update($, collapsedAtom, () => [])
    await update($, offsetAtom, () => 0)
    shouldWalk = true
  }
  const view = await read($, viewAtom)
  const git = await readGit($, root, view !== 'tree')
  await update($, gitAtom, () => git)
  if (shouldWalk) await walkAll($, root)
  else await reconcile($, root, opts.dirs ?? [])
}

const scheduleRefresh = ($: Dollar, dir?: string): void => {
  if (dir !== undefined) pendingDirs.add(dir)
  refreshTimer?.cancel()
  refreshTimer = $.clock.after(REFRESH_DEBOUNCE_MS, () => {
    const dirs = pendingDirs
    pendingDirs = new Set()
    void refresh($, { walk: false, dirs })
  })
}

// ---------- timers ----------

const isShown = async ($: Dollar): Promise<boolean> => (await $.ui.panes()).some(p => p.id === PANE && p.isShown && p.isPlaced)

const pollOnce = async ($: Dollar): Promise<void> => {
  if (await isShown($)) await refresh($, { walk: false })
}

const armPoll = ($: Dollar): void => {
  pollTimer?.cancel()
  pollTimer = $.clock.every(isTurnRunning ? POLL_TURN_MS : POLL_IDLE_MS, () => {
    void pollOnce($)
  })
}

const shimmerOnce = async ($: Dollar): Promise<void> => {
  const active = await read($, activeAtom)
  const now = await $.clock.now()
  if (active.length === 0 && now - lastEndedAt >= SHIMMER_TAIL_MS) {
    shimmerTimer?.cancel()
    shimmerTimer = undefined
    return
  }
  await update($, phaseAtom, n => (n + 1) % 1_000_000)
}

const armShimmer = ($: Dollar): void => {
  if (shimmerTimer) return
  shimmerTimer = $.clock.every(SHIMMER_MS, () => {
    void shimmerOnce($)
  })
}

const trailOnce = async ($: Dollar): Promise<void> => {
  const trail = await read($, trailAtom)
  const now = await $.clock.now()
  const isFading = Object.values(trail).some(t => now - t < TRAIL_FADE_MS)
  if (!isFading) {
    trailTimer?.cancel()
    trailTimer = undefined
    return
  }
  await update($, tickAtom, n => (n + 1) % 1_000_000)
}

const armTrail = ($: Dollar): void => {
  if (trailTimer) return
  trailTimer = $.clock.every(TRAIL_TICK_MS, () => {
    void trailOnce($)
  })
}

const stopTimers = (): void => {
  pollTimer?.cancel()
  shimmerTimer?.cancel()
  trailTimer?.cancel()
  refreshTimer?.cancel()
  animTimer?.cancel()
  pollTimer = shimmerTimer = trailTimer = refreshTimer = animTimer = undefined
}

// ---------- preferences ----------

const savePrefs = async ($: Dollar): Promise<void> => {
  const root = await read($, rootAtom)
  const view = await read($, viewAtom)
  await $.store.set(`collapsed:${root}`, await read($, collapsedAtom))
  await $.store.set('prefs', {
    showIgnored: await read($, showIgnoredAtom),
    focusMode: await read($, focusModeAtom),
    view: view === 'peek' ? 'changes' : view,
  })
}

const loadPrefs = async ($: Dollar, root: string): Promise<void> => {
  const collapsed = await $.store.get(`collapsed:${root}`)
  await update($, collapsedAtom, () => (Array.isArray(collapsed) ? collapsed.filter((x): x is string => typeof x === 'string') : []))
  const prefs = await $.store.get('prefs')
  const p = prefs && typeof prefs === 'object' ? (prefs as { showIgnored?: unknown; focusMode?: unknown; view?: unknown }) : {}
  await update($, showIgnoredAtom, () => (typeof p.showIgnored === 'boolean' ? p.showIgnored : cfg.showIgnored))
  await update($, focusModeAtom, () => p.focusMode === true)
  await update($, viewAtom, () => (p.view === 'changes' ? 'changes' : 'tree'))
  await update($, filterAtom, () => null)
  await update($, peekAtom, () => null)
}

// ---------- the lines the pane shows ----------

type Line =
  | { key: string; kind: 'row'; row: Row }
  | { key: string; kind: 'note'; text: string }
  | { key: string; kind: 'outsideHead' }
  | { key: string; kind: 'outside'; path: string }
  | { key: string; kind: 'group'; label: string }
  | { key: string; kind: 'change'; path: string; state: GitState }
  | { key: string; kind: 'match'; path: string; indices: number[] }
  | { key: string; kind: 'diff'; text: string }

type View = {
  root: string
  git: GitSnapshot
  active: ActiveFile[]
  trail: Record<string, number>
  showIgnored: boolean
  walkDone: boolean
  view: PaneView
  filter: string | null
  focusMode: boolean
  peek: string | null
  focused: string | null
  lines: Line[]
  /** rows a fold ripple is drawing dim as they arrive or leave */
  dimKeys: Set<string>
}

/** Reads the session state and lays the pane's lines out, top to bottom, for the view in force; a read while drawing subscribes the pane. */
const loadView = async ($: StateDollar, now: number): Promise<View> => {
  const [root, dirs, collapsed, git, active, trail, showIgnored, walkDone, view, filter, focusMode, peek, peekDiff, focused, anim] = await Promise.all([
    read($, rootAtom),
    read($, dirsAtom),
    read($, collapsedAtom),
    read($, gitAtom),
    read($, activeAtom),
    read($, trailAtom),
    read($, showIgnoredAtom),
    read($, walkDoneAtom),
    read($, viewAtom),
    read($, filterAtom),
    read($, focusModeAtom),
    read($, peekAtom),
    read($, peekDiffAtom),
    read($, focusedAtom),
    read($, animAtom),
  ])
  await read($, frameAtom)
  const dimKeys = new Set<string>()
  const out = { root, git, active, trail, showIgnored, walkDone, view, filter, focusMode, peek, focused, dimKeys }
  let lines: Line[] = []

  if (view === 'peek' && peek !== null) {
    const text = peekDiff.replace(/\t/g, '  ')
    if (text.trim() === '') lines.push({ key: 'note', kind: 'note', text: 'no diff' })
    else text.split('\n').forEach((t, i) => lines.push({ key: `diff:${i}`, kind: 'diff', text: t }))
    return { ...out, lines }
  }

  if (filter !== null) {
    for (const m of fuzzyFilter(filter, allFiles(dirs), FILTER_MAX)) lines.push({ key: `f:${m.path}`, kind: 'match', path: m.path, indices: m.indices })
    if (lines.length === 0) lines.push({ key: 'note', kind: 'note', text: 'no match' })
    return { ...out, lines }
  }

  if (view === 'changes') {
    for (const { state, label } of GROUPS) {
      const paths = Object.entries(git.files)
        .filter(([, s]) => s === state)
        .map(([p]) => p)
        .sort()
      if (paths.length === 0) continue
      lines.push({ key: `g:${state}`, kind: 'group', label })
      for (const path of paths) lines.push({ key: `f:${path}`, kind: 'change', path, state })
    }
    if (lines.length === 0) lines.push({ key: 'note', kind: 'note', text: git.isRepo ? 'nothing changed' : 'not a git repository' })
    return { ...out, lines }
  }

  let keep: ((path: string, kind: 'dir' | 'file') => boolean) | undefined
  if (focusMode) {
    const inPlay = new Set<string>([
      ...Object.keys(git.files),
      ...Object.keys(trail).filter(p => !isAbsolute(p)),
      ...active.filter(a => !a.isOutside).map(a => a.path),
    ])
    const keepDirs = new Set<string>()
    for (const p of inPlay) for (const a of ancestorsOf(p)) keepDirs.add(a)
    keep = (path, kind) => (kind === 'dir' ? keepDirs.has(path) : inPlay.has(path))
  }
  const deleted = new Set(
    Object.entries(git.files)
      .filter(([, s]) => s === 'deleted')
      .map(([p]) => p),
  )
  const { rows, isFolded } = flatten(dirs, {
    collapsed: new Set(collapsed),
    showIgnored,
    ignored: new Set(git.ignored),
    compactFolders: cfg.compactFolders,
    dirCounts: git.dirCounts,
    deleted,
    maxRows: cfg.maxRows,
    keep,
  })
  for (const row of rows) lines.push({ key: row.key, kind: 'row', row })
  if (anim) {
    // the ripple: the folder's rows arrive top down or leave bottom up, dim at the edge of the move
    const elapsed = now - anim.startedAt
    let i = 0
    lines = lines.filter(line => {
      if (line.kind !== 'row' || !line.row.path.startsWith(`${anim.path}/`)) return true
      const phase = rowPhase(anim, i++, elapsed)
      if (phase === 'dim') dimKeys.add(line.key)
      return phase !== 'hidden'
    })
  }
  if (rows.length === 0) lines.push({ key: 'note', kind: 'note', text: focusMode ? 'nothing in play yet' : walkDone ? 'empty folder' : 'listing…' })
  if (isFolded) lines.push({ key: 'note:fold', kind: 'note', text: `deep folders folded: over ${cfg.maxRows} rows` })
  const outside = [...new Set([...active.map(a => a.path), ...Object.keys(trail)])].filter(isAbsolute).sort()
  if (outside.length > 0) {
    lines.push({ key: 'outside', kind: 'outsideHead' })
    for (const path of outside) lines.push({ key: `o:${path}`, kind: 'outside', path })
  }
  return { ...out, lines }
}

// ---------- actions ----------

const reveal = async ($: Dollar, rel: string): Promise<void> => {
  const above = new Set(ancestorsOf(rel).filter(a => a !== ''))
  const collapsed = await read($, collapsedAtom)
  if (collapsed.some(c => above.has(c))) {
    await update($, collapsedAtom, c => c.filter(p => !above.has(p)))
    await savePrefs($)
  }
  const now = await $.clock.now()
  if (now - lastPersonScrollAt < SCROLL_GRACE_MS) return
  const { lines } = await loadView($, now)
  const at = lines.findIndex(l => l.key === `f:${rel}`)
  if (at < 0) return
  const max = Math.max(0, lines.length - lastVisible)
  await update($, offsetAtom, () => clamp(at - Math.floor(lastVisible / 2), 0, max))
}

const scrollBy = async ($: Dollar, by: number, isJump: boolean): Promise<void> => {
  const { lines } = await loadView($, await $.clock.now())
  const max = Math.max(0, lines.length - lastVisible)
  await update($, offsetAtom, o => clamp(isJump ? (by < 0 ? 0 : max) : o + by, 0, max))
}

/** The now-editing line's press: back to the tree, filter off, and the file in the middle of the window. */
const jumpTo = async ($: Dollar, path: string): Promise<void> => {
  if (isAbsolute(path)) return
  await update($, viewAtom, () => 'tree')
  await update($, filterAtom, () => null)
  lastPersonScrollAt = 0
  await reveal($, path)
}

const mention = async ($: Dollar, rel: string): Promise<void> => {
  const filled = await $.prompt.fill({ text: `@${rel} `, mode: 'insert' })
  if (!filled.isFilled) $.ui.toast(rel)
}

// ---------- the fold ripple ----------

/** Rows the folder contributes to the tree as shown now. */
const countDescendants = async ($: Dollar, path: string): Promise<number> => {
  const { lines } = await loadView($, await $.clock.now())
  return lines.filter(l => l.kind === 'row' && l.row.path.startsWith(`${path}/`)).length
}

/** Ends the ripple in flight, landing a fold that was still on its way. */
const finishAnim = async ($: Dollar): Promise<void> => {
  animTimer?.cancel()
  animTimer = undefined
  const anim = await read($, animAtom)
  if (!anim) return
  if (anim.kind === 'fold') {
    await update($, collapsedAtom, c => (c.includes(anim.path) ? c : [...c, anim.path]))
    await savePrefs($)
  }
  await update($, animAtom, () => null)
}

const animTick = async ($: Dollar): Promise<void> => {
  const anim = await read($, animAtom)
  if (!anim) {
    animTimer?.cancel()
    animTimer = undefined
    return
  }
  const now = await $.clock.now()
  if (isDone(anim, now - anim.startedAt)) await finishAnim($)
  else await update($, frameAtom, n => (n + 1) % 1_000_000)
}

const armAnim = ($: Dollar): void => {
  animTimer?.cancel()
  animTimer = $.clock.every(ANIM_FRAME_MS, () => {
    void animTick($)
  })
}

const startAnim = async ($: Dollar, kind: FoldAnim['kind'], path: string, count: number): Promise<void> => {
  const startedAt = await $.clock.now()
  await update($, animAtom, () => ({ kind, path, startedAt, count, stepMs: stepFor(count) }))
  armAnim($)
}

/** A click on a folder: unfold it with its rows rippling in, or ripple them out and then fold it. */
const toggleDir = async ($: Dollar, path: string): Promise<void> => {
  await finishAnim($)
  const collapsed = await read($, collapsedAtom)
  const isCollapsed = collapsed.includes(path)
  if (isCollapsed) {
    if (!(await read($, dirsAtom))[path]) void walk($, await read($, rootAtom), path, true)
    await update($, collapsedAtom, c => c.filter(p => p !== path))
    await savePrefs($)
    const count = cfg.animate ? await countDescendants($, path) : 0
    if (count > 0) await startAnim($, 'unfold', path, count)
    return
  }
  const count = cfg.animate ? await countDescendants($, path) : 0
  if (count === 0) {
    await update($, collapsedAtom, c => [...c, path])
    await savePrefs($)
    return
  }
  await startAnim($, 'fold', path, count)
}

const toggleIgnored = async ($: Dollar): Promise<void> => {
  await update($, showIgnoredAtom, v => !v)
  await savePrefs($)
}

const collapseAll = async ($: Dollar): Promise<void> => {
  const dirs = await read($, dirsAtom)
  await update($, collapsedAtom, () => allDirs(dirs))
  await update($, offsetAtom, () => 0)
  await savePrefs($)
}

const expandAll = async ($: Dollar): Promise<void> => {
  await update($, collapsedAtom, () => [])
  await savePrefs($)
}

/** `g`: tree <-> changes; from the peek, back to the changes. */
const toggleChanges = async ($: Dollar): Promise<void> => {
  const view = await read($, viewAtom)
  const next: PaneView = view === 'tree' ? 'changes' : view === 'changes' ? 'tree' : 'changes'
  await update($, viewAtom, () => next)
  await update($, offsetAtom, () => 0)
  await savePrefs($)
  if (next === 'changes') void refresh($, { walk: false })
}

const setView = async ($: Dollar, next: PaneView): Promise<void> => {
  await update($, viewAtom, () => next)
  await update($, offsetAtom, () => 0)
  await savePrefs($)
  if (next === 'changes') void refresh($, { walk: false })
}

/** `z`: prune the tree to the files in play, or show it whole. */
const toggleFocus = async ($: Dollar): Promise<void> => {
  await update($, focusModeAtom, v => !v)
  await update($, offsetAtom, () => 0)
  await savePrefs($)
}

/** `f`: show the filter row and put the keys in it, or clear it. */
const toggleFilter = async ($: Dollar): Promise<void> => {
  const filter = await read($, filterAtom)
  if (filter === null) {
    await update($, filterAtom, () => '')
    await update($, offsetAtom, () => 0)
    try {
      await $.ui.focus({ requestId: PANE, key: 'filter' }) // a refusal (the pane lacks the keys) is fine: the row is still there to click
    } catch {
      // nothing to do: the field is drawn either way
    }
  } else {
    await update($, filterAtom, () => null)
    await update($, offsetAtom, () => 0)
  }
}

const setFilter = async ($: Dollar, text: string): Promise<void> => {
  await update($, filterAtom, () => text)
  await update($, offsetAtom, () => 0)
}

/** Enter in the filter: mention the best match. */
const mentionFirst = async ($: Dollar): Promise<void> => {
  const { lines } = await loadView($, await $.clock.now())
  const first = lines.find(l => l.kind === 'match')
  if (first && first.kind === 'match') await mention($, first.path)
}

const openPeek = async ($: Dollar, path: string): Promise<void> => {
  const root = await read($, rootAtom)
  const state = (await read($, gitAtom)).files[path]
  const text = await readDiff($, root, path, state)
  await update($, peekAtom, () => path)
  await update($, peekDiffAtom, () => text)
  await update($, viewAtom, () => 'peek')
  await update($, offsetAtom, () => 0)
}

const closePeek = async ($: Dollar): Promise<void> => {
  await update($, peekAtom, () => null)
  await update($, peekDiffAtom, () => '')
  await update($, viewAtom, () => 'changes')
  await update($, offsetAtom, () => 0)
}

const openPane = async ($: Dollar): Promise<boolean> => {
  const opened = await $.ui.open({ id: PANE, title: 'tree', columns: cfg.columns })
  await update($, closedByHandAtom, () => false)
  await $.store.delete(`closed:${await $.session.id()}`)
  armPoll($)
  return opened.isPlaced
}

const usage = 'tree: usage: /tree [changes | find <text> | refresh | reveal <path> | mention <path> | side left|right]'

// ---------- drawing ----------

const BADGE: Record<GitState, string> = {
  modified: 'M',
  staged: 'S',
  untracked: '?',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  conflicted: '!',
}

const COLOR: Record<GitState, Color> = {
  modified: 'warning',
  staged: 'success',
  untracked: 'diffAdded',
  added: 'diffAdded',
  deleted: 'diffRemoved',
  renamed: 'suggestion',
  conflicted: 'error',
}

const tierColor = (ageMs: number): Color => (ageMs < 10_000 ? 'claude' : ageMs < 120_000 ? 'subtle' : 'inactive')

const countsText = (c: LineCounts | undefined): string => (c ? (c.isBinary ? 'bin' : `+${c.added} −${c.removed}`) : '')

const drawPane = async ($: RenderDollar, e: RenderInput<'Pane'>): Promise<RenderElement> => {
  const table = $.ui.resolve(e)
  const { Box, Text, Button } = table
  const Input = 'Input' in table ? table.Input : undefined // the mobile surface draws no field
  const now = await $.clock.now()
  const { root, git, active, trail, showIgnored, view, filter, focusMode, peek, focused, lines, dimKeys } = await loadView($, now)
  const [phase, offsetWanted] = await Promise.all([read($, phaseAtom), read($, offsetAtom)])
  await read($, tickAtom)
  const cols = Math.max(16, (e.props.bodyColumns || cfg.columns) - 2 * PAD_X)
  const isDocked = e.props.placement === 'dock'
  const bodyRows = Math.max(4, e.props.scroll.bodyRows || e.viewport?.rows || 24)
  lastPlacement = e.props.placement

  const activeByPath = new Map<string, ActiveFile>()
  for (const a of active) if (!activeByPath.has(a.path)) activeByPath.set(a.path, a)

  // header: the working directory's name with the focus hint at the right; then the branch and status, or the peeked file;
  // then what Claude is editing
  const titleName = baseName(root) || root
  const focusHint = e.props.isFocused ? 'esc to leave' : 'ctrl+x tab to focus'
  const hint = cells(titleName) + 2 + cells(focusHint) <= cols ? focusHint : e.props.isFocused ? 'esc' : 'ctrl+x tab'
  const title = truncateMiddle(titleName, Math.max(8, cols - cells(hint) - 2))
  const titlePad = Math.max(1, cols - cells(title) - cells(hint))
  const hasSecondRow = git.isRepo || view === 'peek'
  const hasFilterRow = filter !== null && view !== 'peek'
  const current = active.length > 0 ? active[active.length - 1] : undefined
  const latest = Object.entries(trail).sort((x, y) => y[1] - x[1])[0]
  const lastPath = !current && latest && now - latest[1] < LAST_LINGER_MS ? latest[0] : undefined
  const nowPath = current?.path ?? lastPath
  const headerRows = (hasSecondRow ? 2 : 1) + (hasFilterRow ? 1 : 0) + (nowPath !== undefined ? 1 : 0)

  // the legend: always drawn, pinned under the rows; its keys work while the pane holds the keyboard
  type LegendItem = { key: string; hotkey: string; label: string; run: () => void }
  const legend: LegendItem[] = []
  if (view === 'peek') legend.push({ key: 'act:changes', hotkey: 'g', label: 'back', run: () => void closePeek($) })
  else legend.push({ key: 'act:changes', hotkey: 'g', label: view === 'changes' ? 'tree' : 'changes', run: () => void toggleChanges($) })
  if (view !== 'peek') legend.push({ key: 'act:filter', hotkey: 'f', label: filter === null ? 'find' : 'close', run: () => void toggleFilter($) })
  if (view === 'tree' && filter === null) {
    legend.push({ key: 'act:focus', hotkey: 'z', label: focusMode ? 'all' : 'focus', run: () => void toggleFocus($) })
    legend.push({ key: 'act:ignored', hotkey: 'h', label: showIgnored ? 'hide ignored' : 'ignored', run: () => void toggleIgnored($) })
  }
  legend.push({ key: 'act:refresh', hotkey: 'r', label: 'refresh', run: () => void refresh($, { walk: true }) })
  if (view === 'tree' && filter === null) {
    legend.push({ key: 'act:collapse', hotkey: 'c', label: 'fold', run: () => void collapseAll($) })
    legend.push({ key: 'act:expand', hotkey: 'e', label: 'unfold', run: () => void expandAll($) })
  }
  // the legend laid out row by row (the engine draws a plain hotkey Button as `h: label`), so every row carries the edge cell
  const legendLines: LegendItem[][] = [[]]
  let legendUsed = 0
  for (const item of legend) {
    const width = 3 + cells(item.label)
    const line = legendLines[legendLines.length - 1] as LegendItem[]
    if (legendUsed > 0 && legendUsed + LEGEND_GAP + width > cols) {
      legendLines.push([item])
      legendUsed = width
    } else {
      line.push(item)
      legendUsed = legendUsed > 0 ? legendUsed + LEGEND_GAP + width : width
    }
  }
  const legendRows = legendLines.length

  // the window: docked, the pane owns it (header + rows + legend fill the body exactly); inline, the engine scrolls the whole tree
  const visible = isDocked ? Math.max(1, bodyRows - headerRows - PAD_ROWS - legendRows) : lines.length
  lastVisible = visible
  const maxOffset = Math.max(0, lines.length - visible)
  const offset = clamp(offsetWanted, 0, maxOffset)
  const shown = isDocked ? lines.slice(offset, offset + visible) : lines
  const padRows = isDocked ? Math.max(0, visible - shown.length) : 0
  const hiddenAbove = isDocked ? offset : 0
  const hiddenBelow = isDocked ? Math.max(0, lines.length - offset - visible) : 0
  const hasBar = isDocked && maxOffset > 0
  const rowCols = hasBar ? cols - 2 : cols // the scrollbar takes a cell, with one of space before it
  const thumbLen = hasBar ? Math.max(1, Math.round((visible * visible) / lines.length)) : 0
  const thumbStart = hasBar ? Math.round((offset / maxOffset) * (visible - thumbLen)) : 0

  // the ember glow: a radial tint around the file Claude is writing, fading out for a moment after the edit ends
  const glowing = active.find(a => !a.isRead)
  const glowFactor = glowing ? 1 : latest && now - latest[1] < GLOW_FADE_MS ? 1 - (now - latest[1]) / GLOW_FADE_MS : 0
  const glowPath = glowing ? glowing.path : latest ? latest[0] : ''
  const glowKey = isAbsolute(glowPath) ? `o:${glowPath}` : `f:${glowPath}`
  const tints = cfg.glow && glowFactor > 0 ? glowTints(cfg.accent, isLightTheme) : []
  const glowAt = tints.length > 0 ? shown.findIndex(l => l.key === glowKey) : -1
  const tintFor = (s: number): string | undefined => {
    if (glowAt < 0) return undefined
    const level = Math.abs(s - glowAt) + (glowFactor > 0.66 ? 0 : glowFactor > 0.33 ? 1 : 2)
    return tints[level]
  }
  // the guide from the folder down to the glowing file lights up
  const litLevel = new Map<string, number>()
  if (glowFactor > 0) {
    const at = lines.findIndex(l => l.key === glowKey)
    const target = at >= 0 ? lines[at] : undefined
    if (target && target.kind === 'row' && target.row.depth > 0) {
      const level = target.row.depth - 1
      let from = at - 1
      while (from >= 0) {
        const l = lines[from]
        if (l && l.kind === 'row' && l.row.kind === 'dir' && l.row.depth === level) break
        from--
      }
      for (let k = from + 1; k <= at; k++) {
        const l = lines[k]
        if (l) litLevel.set(l.key, level)
      }
    }
  }

  const shimmer = (name: string, a: ActiveFile): RenderElement[] => {
    const base: Color = a.isRead ? 'subtle' : 'claude'
    const hot: Color = a.isRead ? 'text' : 'claude'
    if (cfg.shimmer === 'off') return [<Text color={base} bold>{name}</Text>]
    if (cfg.shimmer === 'pulse') return [<Text color={base} bold={phase % 10 < 5}>{name}</Text>]
    const chars = [...name]
    const n = chars.length
    const p = phase % (n + SHIMMER_WINDOW)
    const start = Math.max(0, p - SHIMMER_WINDOW + 1)
    const end = Math.min(n, p + 1)
    const parts: RenderElement[] = []
    const before = chars.slice(0, start).join('')
    const mid = chars.slice(start, end).join('')
    const after = chars.slice(end).join('')
    if (before) parts.push(<Text color={base} dimColor>{before}</Text>)
    if (mid) parts.push(<Text color={hot} bold>{mid}</Text>)
    if (after) parts.push(<Text color={base} dimColor>{after}</Text>)
    return parts
  }

  const glyphFor = (path: string, isDir: boolean, isOpen: boolean): { glyph: string; color: Color; a: ActiveFile | undefined } => {
    const a = activeByPath.get(path)
    const touched = trail[path]
    if (isDir) return { glyph: isOpen ? '▾' : '▸', color: 'subtle', a: undefined }
    if (a) return { glyph: a.isRead ? '●' : (BREATH[Math.floor(phase / 3) % BREATH.length] as string), color: a.isRead ? 'subtle' : 'claude', a }
    if (touched !== undefined) return { glyph: '·', color: tierColor(now - touched), a: undefined }
    return { glyph: ' ', color: 'subtle', a: undefined }
  }

  const press = (row: Row) => () => {
    void (row.kind === 'dir' ? toggleDir($, row.path) : mention($, row.path))
  }

  /**
   * The cell at the left edge of every row: an accent edge down the whole pane while it holds the keyboard, thicker on the
   * row the focus ring is on, so a glance says whether the hotkeys will land here or in the prompt.
   */
  const edge = (key?: string): RenderElement => (
    <Text color={cfg.accent}>{e.props.isFocused ? (key !== undefined && focused === key ? '▍' : '▏') : ' '}</Text>
  )

  const drawRow = (row: Row): RenderElement => {
    const guides = '│ '.repeat(row.depth) // one faint guide per level, in the indent cells
    const lit = litLevel.get(row.key)
    const { glyph, color: glyphColor, a } = glyphFor(row.path, row.kind === 'dir', row.isOpen)
    const state = git.files[row.path]
    const badge = row.kind === 'dir' ? (!row.isOpen && row.count > 0 ? String(row.count) : '') : state ? BADGE[state] : ''
    const badgeColor: Color = row.kind === 'dir' ? 'subtle' : state ? COLOR[state] : 'text'
    const nameRoom = rowCols - cells(guides) - 2 - (badge ? cells(badge) + 1 : 0)
    const name = truncateMiddle(row.name, Math.max(1, nameRoom))
    const isTruncated = name !== row.name
    const pad = Math.max(1, rowCols - cells(guides) - 2 - cells(name) - cells(badge))
    const nameColor: Color | undefined = row.kind === 'dir' ? undefined : state ? COLOR[state] : undefined
    const isStruck = row.isMissing || state === 'deleted'
    const isDim = row.isIgnored || dimKeys.has(row.key) // ignored, or arriving or leaving in a ripple
    const dot = row.kind === 'file' && !isTruncated ? name.lastIndexOf('.') : -1
    const nameNodes: RenderElement[] = a
      ? shimmer(name, a)
      : row.kind === 'dir'
        ? [
            <Text bold dimColor={isDim}>
              {name}
            </Text>,
          ]
        : dot > 0
          ? [
              <Text color={nameColor} dimColor={isDim} strikethrough={isStruck}>
                {name.slice(0, dot)}
              </Text>,
              <Text color={nameColor} dimColor strikethrough={isStruck}>
                {name.slice(dot)}
              </Text>,
            ]
          : [
              <Text color={nameColor} dimColor={isDim} strikethrough={isStruck}>
                {name}
              </Text>,
            ]
    return (
      <Box key={`h:${row.key}`} flexDirection="row" hover={{ backgroundColor: 'subtle' }}>
        <Button plain key={row.key} onPress={press(row)} hover={{ bold: true, dimColor: false }}>
          {Array.from({ length: row.depth }, (_, level) =>
            level === lit ? (
              <Text color={cfg.accent}>│ </Text>
            ) : (
              <Text color="subtle" dimColor>
                │{' '}
              </Text>
            ),
          )}
          <Text color={glyphColor} dimColor={isDim && !a}>
            {glyph}
          </Text>{' '}
          {nameNodes}
        </Button>
        {badge ? <Text>{' '.repeat(pad)}</Text> : null}
        {badge ? (
          <Text color={badgeColor} dimColor={row.kind === 'dir'} bold={state === 'conflicted'}>
            {badge}
          </Text>
        ) : null}
        {isTruncated ? (
          <Box position="absolute" top={0} left={cells(guides) + 2} display="none" hover={{ display: 'flex' }}>
            <Text inverse>{row.name}</Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  const drawChange = (path: string, state: GitState): RenderElement => {
    const { glyph, color: glyphColor, a } = glyphFor(path, false, false)
    const counts = countsText(git.numstat[path])
    const room = rowCols - 2 - (counts ? cells(counts) + 1 : 0) - 2
    const shownPath = shortenPath(path, Math.max(1, room))
    const pad = Math.max(1, rowCols - 2 - cells(shownPath) - cells(counts) - 2)
    return (
      <Box key={`h:f:${path}`} flexDirection="row" hover={{ backgroundColor: 'subtle' }}>
        <Button plain key={`f:${path}`} onPress={() => void mention($, path)} hover={{ bold: true, dimColor: false }}>
          <Text color={glyphColor}>{glyph}</Text> {a ? shimmer(shownPath, a) : <Text color={COLOR[state]} strikethrough={state === 'deleted'}>{shownPath}</Text>}
        </Button>
        <Text>{' '.repeat(pad)}</Text>
        {counts ? <Text dimColor>{counts}</Text> : null}
        <Text> </Text>
        <Button plain key={`pk:${path}`} onPress={() => void openPeek($, path)} hover={{ bold: true }}>
          ±
        </Button>
      </Box>
    )
  }

  const drawMatch = (path: string, indices: number[]): RenderElement => {
    const { glyph, color: glyphColor, a } = glyphFor(path, false, false)
    const state = git.files[path]
    const badge = state ? BADGE[state] : ''
    const room = rowCols - 2 - (badge ? 2 : 0)
    const shownPath = truncateStart(path, Math.max(1, room))
    const cut = path.length - shownPath.length + (shownPath.startsWith('…') ? 1 : 0) // chars dropped from the start, less the ellipsis
    const hit = new Set(indices.map(i => i - cut + (shownPath.startsWith('…') ? 1 : 0)))
    const chars = [...shownPath]
    const parts: RenderElement[] = []
    let run = ''
    let runHit = false
    const flush = () => {
      if (run) parts.push(runHit ? <Text color="claude" bold>{run}</Text> : <Text color={state ? COLOR[state] : undefined}>{run}</Text>)
      run = ''
    }
    chars.forEach((ch, i) => {
      const isHit = hit.has(i)
      if (isHit !== runHit) {
        flush()
        runHit = isHit
      }
      run += ch
    })
    flush()
    const pad = Math.max(1, rowCols - 2 - cells(shownPath) - cells(badge))
    return (
      <Box key={`h:f:${path}`} flexDirection="row" hover={{ backgroundColor: 'subtle' }}>
        <Button plain key={`f:${path}`} onPress={() => void mention($, path)} hover={{ bold: true, dimColor: false }}>
          <Text color={glyphColor}>{glyph}</Text> {a ? shimmer(shownPath, a) : parts}
        </Button>
        {badge ? <Text>{' '.repeat(pad)}</Text> : null}
        {badge ? <Text color={state ? COLOR[state] : 'text'}>{badge}</Text> : null}
      </Box>
    )
  }

  const drawDiff = (text: string): RenderElement => {
    const shownText = [...text].length > rowCols ? [...text].slice(0, rowCols - 1).join('') + '…' : text
    if (text.startsWith('+++') || text.startsWith('---') || text.startsWith('diff ') || text.startsWith('index ')) return <Text dimColor>{shownText}</Text>
    if (text.startsWith('@@')) return <Text color="subtle">{shownText}</Text>
    if (text.startsWith('+')) return <Text color="diffAdded">{shownText}</Text>
    if (text.startsWith('-')) return <Text color="diffRemoved">{shownText}</Text>
    return <Text>{shownText}</Text>
  }

  const drawLine = (line: Line): RenderElement => {
    switch (line.kind) {
      case 'row':
        return drawRow(line.row)
      case 'note':
        return <Text dimColor>{line.text}</Text>
      case 'outsideHead':
        return <Text color="subtle">⋯ outside project</Text>
      case 'outside': {
        const { glyph, color: glyphColor, a } = glyphFor(line.path, false, false)
        const shownPath = shortenPath(line.path, Math.max(1, rowCols - 4), homeDir)
        return (
          <Box key={`h:${line.key}`} flexDirection="row">
            <Text>  </Text>
            <Text color={glyphColor}>{glyph}</Text>
            <Text> </Text>
            {a ? shimmer(shownPath, a) : <Text dimColor>{shownPath}</Text>}
          </Box>
        )
      }
      case 'group':
        return <Text color="subtle">{line.label}</Text>
      case 'change':
        return drawChange(line.path, line.state)
      case 'match':
        return drawMatch(line.path, line.indices)
      case 'diff':
        return drawDiff(line.text)
    }
  }

  /** A shown line: the edge cell, the line, its glow tint, and the scrollbar cell at the right edge while the lines overflow. */
  const wrapLine = (el: RenderElement, i: number, key: string): RenderElement => {
    const isThumb = i >= thumbStart && i < thumbStart + thumbLen
    return (
      <Box flexDirection="row" backgroundColor={tintFor(i)}>
        {edge(key)}
        {hasBar ? <Box width={rowCols}>{el}</Box> : el}
        {hasBar ? <Text> </Text> : null}
        {hasBar ? (
          <Text color={isThumb ? 'text' : 'subtle'} dimColor={!isThumb}>
            {isThumb ? '┃' : '│'}
          </Text>
        ) : null}
      </Box>
    )
  }

  // branch row: branch on the left, status on the right
  const dirty = Object.keys(git.files).length
  const left = `⎇ ${git.branch ?? 'HEAD'}`
  const rightParts: string[] = []
  if (git.failed) rightParts.push('git ✗')
  else if (git.isRepo) {
    if (git.ahead > 0) rightParts.push(`↑${git.ahead}`)
    if (git.behind > 0) rightParts.push(`↓${git.behind}`)
    rightParts.push(dirty > 0 ? `·${dirty}` : '✓')
  }
  const right = rightParts.join(' ')
  const leftText = truncateMiddle(left, Math.max(4, cols - cells(right) - 1))
  const headerPad = Math.max(1, cols - cells(leftText) - cells(right))
  const rightColor: Color = git.failed ? 'error' : dirty > 0 ? 'warning' : 'success'

  // peek row: the file and its counts, pressable to go back
  const peekCounts = peek ? countsText(git.numstat[peek]) : ''
  const peekPath = peek ? shortenPath(peek, Math.max(1, cols - 2 - (peekCounts ? cells(peekCounts) + 1 : 0))) : ''

  // now-editing row: the file Claude has open, with the shimmer; else the one it just closed, dim, for a few seconds
  const nowShown = nowPath !== undefined ? shortenPath(nowPath, Math.max(1, cols - 2 - (current ? 0 : 6)), homeDir) : ''

  return (
    <Box flexDirection="column" paddingRight={PAD_X}>
      <Box key="h:title" flexDirection="row">
        {edge()}
        <Text bold color={e.props.isFocused ? cfg.accent : undefined}>
          {title}
        </Text>
        <Text>{' '.repeat(titlePad)}</Text>
        <Text color={e.props.isFocused ? cfg.accent : undefined} dimColor={!e.props.isFocused}>
          {hint}
        </Text>
        <Box position="absolute" top={0} left={PAD_X} display="none" hover={{ display: 'flex' }}>
          <Text inverse>{shortenPath(root, cols, homeDir)}</Text>
        </Box>
      </Box>
      {view === 'peek' && peek !== null ? (
        <Box key="h:peek" flexDirection="row">
          {edge()}
          <Button plain key="act:back" onPress={() => void closePeek($)} hover={{ bold: true }}>
            <Text color="subtle">±</Text> <Text color={git.files[peek] ? COLOR[git.files[peek] as GitState] : undefined}>{peekPath}</Text>
          </Button>
          {peekCounts ? <Text> </Text> : null}
          {peekCounts ? <Text dimColor>{peekCounts}</Text> : null}
        </Box>
      ) : git.isRepo ? (
        <Box flexDirection="row">
          {edge()}
          <Text color="subtle">{leftText}</Text>
          <Text>{' '.repeat(headerPad)}</Text>
          {right ? <Text color={rightColor}>{right}</Text> : null}
        </Box>
      ) : null}
      {nowPath !== undefined ? (
        <Box key="h:now" flexDirection="row" hover={{ backgroundColor: 'subtle' }}>
          {edge('act:now')}
          <Button plain key="act:now" onPress={() => void jumpTo($, nowPath)} hover={{ bold: true, dimColor: false }}>
            {current ? <Text color={current.isRead ? 'subtle' : 'claude'}>●</Text> : <Text color="subtle">·</Text>}{' '}
            {current ? shimmer(nowShown, current) : <Text dimColor>last: {nowShown}</Text>}
          </Button>
        </Box>
      ) : null}
      {hasFilterRow ? (
        <Box key="h:filter" flexDirection="row">
          {edge('filter')}
          <Text color="subtle">› </Text>
          {Input ? (
            <Input
              key="filter"
              value={filter ?? ''}
              placeholder="type to find"
              submitLabel="mention"
              autoFocus
              onInput={value => void setFilter($, value)}
              onSubmit={() => void mentionFirst($)}
            />
          ) : (
            <Text dimColor>{filter || 'use /tree find <text>'}</Text>
          )}
          <Text> </Text>
          <Button plain key="act:clear" onPress={() => void toggleFilter($)} dimColor hover={{ dimColor: false }}>
            ×
          </Button>
        </Box>
      ) : null}
      <Box flexDirection="row">
        {edge()}
        {hiddenAbove > 0 ? <Text dimColor>↑ {hiddenAbove} more</Text> : <Text> </Text>}
      </Box>
      {shown.map((line, i) => wrapLine(drawLine(line), i, line.key))}
      {Array.from({ length: padRows }, () => (
        <Box flexDirection="row">
          {edge()}
          <Text> </Text>
        </Box>
      ))}
      <Box flexDirection="row">
        {edge()}
        {hiddenBelow > 0 ? <Text dimColor>↓ {hiddenBelow} more</Text> : <Text> </Text>}
      </Box>
      {legendLines.map(items => (
        <Box flexDirection="row">
          {edge()}
          <Box flexDirection="row" columnGap={LEGEND_GAP}>
            {items.map(l => (
              <Button plain hotkey={l.hotkey} key={l.key} dimColor={!e.props.isFocused} onPress={l.run}>
                {l.label}
              </Button>
            ))}
          </Box>
        </Box>
      ))}
      {/* one row past the body, never shown: it keeps the engine's scroll keys live, and the ui.scroll hook turns them into the pane's own window */}
      {isDocked ? <Text> </Text> : null}
    </Box>
  )
}

// ---------- hooks ----------

export const register: Register = (on, options) => {
  cfg = readConfig(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tree',
      description: 'File tree pane: toggle it, or changes, find <text>, refresh, reveal <path>, mention <path>, side left|right',
      argumentHint: '[changes | find <text> | refresh | reveal <path> | mention <path> | side left|right]',
    })
    const root = normalizeRoot(await $.session.root())
    homeDir = normalizeRoot((await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '')
    try {
      const theme = (await $.config.list()).find(row => row.key === 'theme')?.value
      isLightTheme = typeof theme === 'string' && theme.includes('light')
    } catch {
      isLightTheme = false
    }
    await update($, animAtom, () => null)
    await update($, rootAtom, () => root)
    await update($, dirsAtom, () => ({}))
    await update($, walkDoneAtom, () => false)
    await update($, focusedAtom, () => null)
    await loadPrefs($, root)
    const closed = (await $.store.get(`closed:${await $.session.id()}`)) === true
    await update($, closedByHandAtom, () => closed)
    const started = await next(e)
    if (cfg.openOnStart && e.isInteractive && !closed) {
      void $.ui.open({ id: PANE, title: 'tree', columns: cfg.columns })
    }
    void refresh($, { walk: true })
    armPoll($)
    return started
  })

  on('command.run', { command: 'tree' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    switch (verb) {
      case '': {
        const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
        if (isOpen) {
          await $.ui.close({ id: PANE })
          return { text: 'tree: closed.' }
        }
        const isPlaced = await openPane($)
        void refresh($, { walk: true })
        return { text: isPlaced ? 'tree: opened.' : 'tree: opened; it shows once the terminal is wide enough (110 columns in fullscreen).' }
      }
      case 'changes': {
        if (!(await $.ui.panes()).some(p => p.id === PANE)) await openPane($)
        await setView($, 'changes')
        return { text: 'tree: showing the changes.' }
      }
      case 'find': {
        if (!(await $.ui.panes()).some(p => p.id === PANE)) await openPane($)
        await update($, viewAtom, v => (v === 'peek' ? 'changes' : v))
        await setFilter($, arg)
        return { text: arg ? `tree: finding ${arg}.` : 'tree: filter opened.' }
      }
      case 'refresh': {
        await refresh($, { walk: true })
        return { text: 'tree: refreshed.' }
      }
      case 'reveal': {
        if (!arg) return { text: 'tree: reveal needs a path.' }
        const rel = relativeTo(await read($, rootAtom), arg)
        if (rel === null) return { text: `tree: ${arg} is outside the project.` }
        await reveal($, rel)
        return { text: `tree: revealed ${rel}.` }
      }
      case 'mention': {
        if (!arg) return { text: 'tree: mention needs a path.' }
        const rel = relativeTo(await read($, rootAtom), arg) ?? toPosix(arg)
        await mention($, rel)
        return { text: `tree: mentioned ${rel}.` }
      }
      case 'side': {
        if (arg !== 'left' && arg !== 'right') return { text: 'tree: side takes left or right.' }
        const set = await $.config.set({ key: 'tree.side', value: arg })
        if (set.deny) return { text: `tree: could not set side: ${set.deny}` }
        return {
          text: `tree: side preference set to ${arg}. This Claude Code build docks panes on the right; the preference applies once a build lets a plugin choose.`,
        }
      }
      default:
        return { text: usage }
    }
  })

  on('tool.call', { tool: ['Edit', 'Write', 'NotebookEdit', 'Read'] }, async ($, e, next) => {
    const raw = 'notebook_path' in e ? e.notebook_path : 'file_path' in e ? e.file_path : undefined
    const isRead = e.tool === 'Read'
    if (typeof raw !== 'string' || (isRead && !cfg.readsShimmer)) return next(e)
    const root = await read($, rootAtom)
    const rel = relativeTo(root, raw)
    const path = rel ?? toPosix(raw)
    const since = await $.clock.now()
    await update($, activeAtom, list => [
      ...list,
      { path, isOutside: rel === null, toolUseId: e.tool_use_id, tool: String(e.tool), agentId: e.agentId, since, isRead },
    ])
    if (rel !== null && cfg.followClaude) void reveal($, rel)
    armShimmer($)
    try {
      return await next(e)
    } finally {
      const ended = await $.clock.now()
      lastEndedAt = ended
      await update($, activeAtom, list => list.filter(a => a.toolUseId !== e.tool_use_id))
      await update($, trailAtom, t => ({ ...t, [path]: ended }))
      armTrail($)
      if (!isRead) scheduleRefresh($, rel === null ? undefined : parentOf(rel))
    }
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    try {
      return await next(e)
    } finally {
      scheduleRefresh($)
    }
  }).catch(($, e, next) => next(e))

  on('turn.start', ($, e, next) => {
    isTurnRunning = true
    armPoll($)
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      isTurnRunning = false
      armPoll($)
      scheduleRefresh($)
    }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, activeAtom, () => [])
      await update($, trailAtom, () => ({}))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e) => drawPane($, e))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') {
      await update($, closedByHandAtom, () => true)
      await $.store.set(`closed:${await $.session.id()}`, true)
    }
    stopTimers()
    return next(e)
  })

  // A theme change picks the other glow palette.
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const set = await next(e)
    if (typeof e.value === 'string') isLightTheme = e.value.includes('light')
    $.ui.invalidate('ui.render')
    return set
  })

  // The focus ring's element, for the cursor mark.
  on('ui.focus', { requestId: PANE }, async ($, e, next) => {
    await update($, focusedAtom, () => e.element ?? null)
    return next(e)
  })

  // Docked, the pane owns its window: the engine's move is answered with the pane's own, and the engine's window stays put.
  on('ui.scroll', { requestId: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') lastPersonScrollAt = await $.clock.now()
    if (lastPlacement !== 'dock') return next(e)
    await scrollBy($, e.by, Math.abs(e.by) > e.bodyRows)
    return {}
  })
}
