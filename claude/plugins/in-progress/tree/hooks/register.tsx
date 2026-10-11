import { atom, read, update } from 'claude-code'
import type { Color, EngineInterface, Hook, PluginOptions, Register, RenderElement, RenderInput, Timer } from 'claude-code'

import type { ActiveFile, DirListing, FoldAnim, GitSnapshot, GitState, LineCounts, PaneView, Preview } from '../types'
import { isDone, rowPhase, stepFor } from './anim'
import { BLACK, CLAUDE_ACCENT, clamp, feather, glassPalette, glassRow, glowOver, glowWeight, gradientRuns, mix, parseHex, ramp, smoothstep, sweepAt, toHex, WHITE, type Rgb } from './color'
import { fuzzyFilter } from './find'
import { EMPTY_GIT, GROUPS, parseIgnored, parseNumstat, parseStatus, pathsIn } from './git'
import { absoluteOf, ancestorsOf, baseName, cells, isAbsolute, isWindowsPath, normalizeRoot, parentOf, relativeTo, shortenPath, toPosix, truncateMiddle, truncateStart } from './paths'
import { allDirs, allFiles, childDirs, flatten, type Row } from './tree'

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
/** above this many rows the tree's deepest levels start folded */
const MAX_ROWS = 2000
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
/** rows the cursor keeps between itself and the window's edge while there are rows beyond */
const CURSOR_MARGIN = 2
/** the preview reads a file up to this size, and shows up to this many lines of it */
const PREVIEW_MAX_BYTES = 1_000_000
const PREVIEW_MAX_LINES = 20_000
const EDITOR_TIMEOUT_MS = 10_000
/** the preview band's frame: one cell of border on each edge, and one of room inside it left and right */
const BAND_BORDER = 1
const BAND_PAD_X = 1

// ---------- session state, held by the engine (survives a hot reload); declared in ../types ----------

const rootAtom = atom({ plugin: 'tree', key: 'root' } as const, '')
const dirsAtom = atom({ plugin: 'tree', key: 'dirs' } as const, {} as Record<string, DirListing>)
const collapsedAtom = atom({ plugin: 'tree', key: 'collapsed' } as const, [] as string[])
const gitAtom = atom({ plugin: 'tree', key: 'git' } as const, EMPTY_GIT)
const activeAtom = atom({ plugin: 'tree', key: 'active' } as const, [] as ActiveFile[])
const trailAtom = atom({ plugin: 'tree', key: 'trail' } as const, {} as Record<string, number>)
const phaseAtom = atom({ plugin: 'tree', key: 'phase' } as const, 0)
const showIgnoredAtom = atom({ plugin: 'tree', key: 'showIgnored' } as const, false)
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
const previewAtom = atom({ plugin: 'tree', key: 'preview' } as const, null as Preview | null)
const previewOffsetAtom = atom({ plugin: 'tree', key: 'previewOffset' } as const, 0)

export type Config = {
  columns: number
  openOnStart: boolean
  followClaude: boolean
  readsShimmer: boolean
  shimmer: 'sweep' | 'pulse' | 'off'
  showIgnored: boolean
  compactFolders: boolean
  accent: string
  glow: boolean
  glass: boolean
  animate: boolean
  editor: string
  /** where a file preview draws: the band above the prompt, as wide as the transcript, or inside the tree pane */
  previewIn: 'band' | 'pane'
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
/** lines the preview showed at its last draw: what paging sizes itself to */
let lastPreviewVisible = 20
/** the person's home folder, shown as `~` in long paths */
let homeDir = ''
/** whether the person's theme is a light one: picks the glow palette */
let isLightTheme = false
let animTimer: Timer | undefined

function readConfig(o: PluginOptions): Config {
  return {
    columns: typeof o['columns'] === 'number' && o['columns'] > 0 ? Math.floor(o['columns']) : 32,
    openOnStart: o['openOnStart'] !== false,
    followClaude: o['followClaude'] !== false,
    readsShimmer: o['readsShimmer'] !== false,
    shimmer: o['shimmer'] === 'pulse' ? 'pulse' : o['shimmer'] === 'off' ? 'off' : 'sweep',
    showIgnored: o['showIgnored'] === true,
    compactFolders: o['compactFolders'] !== false,
    accent: typeof o['accent'] === 'string' && parseHex(o['accent']) ? o['accent'] : CLAUDE_ACCENT,
    glow: o['glow'] !== false,
    glass: o['glass'] !== false,
    animate: o['animate'] !== false,
    editor: typeof o['editor'] === 'string' && o['editor'].trim() !== '' ? o['editor'] : 'code -g {path}:{line}',
    previewIn: o['previewIn'] === 'pane' ? 'pane' : 'band',
  }
}

/** A text's lines, without the empty one after a final newline. */
const splitLines = (text: string): string[] => {
  const lines = text.split('\n')
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()
  return lines
}

const isBinary = (text: string): boolean => text.includes('\0')

/** The file Claude most recently closed, and when. */
const latestOf = (trail: Record<string, number>): [string, number] | undefined => {
  let latest: [string, number] | undefined
  for (const entry of Object.entries(trail)) if (!latest || entry[1] > latest[1]) latest = entry
  return latest
}

// ---------- git ----------

/** Lines in a text file, or null for a binary or unreadable one. */
const countLines = async ($: Dollar, abs: string): Promise<number | null> => {
  try {
    const text = await $.fs.read(abs)
    if (isBinary(text)) return null
    return text === '' ? 0 : splitLines(text).length
  } catch {
    return null
  }
}

const readGit = async ($: Dollar, root: string, withCounts: boolean): Promise<GitSnapshot> => {
  const at = await $.clock.now()
  try {
    const top = await $.process.run(['git', 'rev-parse', '--show-prefix'], { cwd: root, timeoutMs: 10_000 })
    if (top.exitCode !== 0) return EMPTY_GIT
    const prefix = toPosix(top.stdout.trim())
    const [status, ignored] = await Promise.all([
      $.process.run(['git', 'status', '--porcelain=v2', '-z', '--branch', `--untracked-files=${untrackedMode}`], { cwd: root, timeoutMs: 20_000 }),
      $.process.run(['git', 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'], { cwd: root, timeoutMs: 20_000 }),
    ])
    const took = (await $.clock.now()) - at
    if (took > SLOW_STATUS_MS) untrackedMode = 'normal'
    if (status.exitCode !== 0) return { ...(await read($, gitAtom)), isRepo: true, failed: true }
    const parsed = parseStatus(status.stdout, prefix)
    let numstat: Record<string, LineCounts> = {}
    if (withCounts) {
      const ns = await $.process.run(['git', 'diff', 'HEAD', '--numstat', '-z'], { cwd: root, timeoutMs: 20_000 })
      if (ns.exitCode === 0) numstat = parseNumstat(ns.stdout, prefix)
      const untracked = pathsIn(parsed.files, 'untracked').slice(0, UNTRACKED_COUNT_MAX)
      const lineCounts = await Promise.all(untracked.map(path => countLines($, absoluteOf(root, path))))
      untracked.forEach((path, i) => {
        const n = lineCounts[i] ?? null
        numstat[path] = n === null ? { added: 0, removed: 0, isBinary: true } : { added: n, removed: 0, isBinary: false }
      })
    }
    return {
      isRepo: true,
      failed: false,
      ...parsed,
      ignored: ignored.exitCode === 0 ? parseIgnored(ignored.stdout) : [],
      numstat,
    }
  } catch {
    return { ...(await read($, gitAtom)), failed: true }
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
  try {
    const entries = await $.fs.list(absoluteOf(root, rel))
    return { entries: entries.map(x => ({ name: x.name, kind: x.kind === 'dir' ? ('dir' as const) : ('file' as const) })) }
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
  for (let head = 0; head < queue.length; head++) {
    if (generation !== walkGeneration) return
    const rel = queue[head] as string
    const listing = await listDir($, root, rel)
    if (!listing) continue
    batch[rel] = listing
    for (const child of childDirs(rel, listing)) if (walkIgnored || !ignored.has(`${child}/`)) queue.push(child)
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
    const name = baseName(path)
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
    for (const child of childDirs(dir, listing)) if (!known[child]) void walk($, root, child, false)
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
  const lastEndedAt = latestOf(await read($, trailAtom))?.[1] ?? 0
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
  await update($, frameAtom, n => (n + 1) % 1_000_000)
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

/** The view a preview sits over, or the view itself while no preview shows. */
const viewUnder = (view: PaneView, preview: Preview | null): PaneView => (view === 'file' ? (preview?.back ?? 'tree') : view)

const savePrefs = async ($: Dollar): Promise<void> => {
  const root = await read($, rootAtom)
  const under = viewUnder(await read($, viewAtom), await read($, previewAtom))
  await $.store.set(`collapsed:${root}`, await read($, collapsedAtom))
  await $.store.set('prefs', {
    showIgnored: await read($, showIgnoredAtom),
    focusMode: await read($, focusModeAtom),
    view: under === 'changes' || under === 'peek' ? 'changes' : 'tree',
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
  await update($, previewAtom, () => null)
  await update($, previewOffsetAtom, () => 0)
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
  const out = { root, git, active, trail, showIgnored, view, filter, focusMode, peek, focused, dimKeys }
  let lines: Line[] = []

  // the preview in the pane draws its own body; in the band, the pane goes on showing the view under it
  const preview = view === 'file' ? await read($, previewAtom) : null
  if (view === 'file' && (cfg.previewIn === 'pane' || preview === null)) return { ...out, lines }
  const under = viewUnder(view, preview)

  if (under === 'peek' && peek !== null) {
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

  if (under === 'changes') {
    for (const { state, label } of GROUPS) {
      const paths = pathsIn(git.files, state).sort()
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
      ...active.map(a => a.path).filter(p => !isAbsolute(p)),
    ])
    const keepDirs = new Set<string>()
    for (const p of inPlay) for (const a of ancestorsOf(p)) keepDirs.add(a)
    keep = (path, kind) => (kind === 'dir' ? keepDirs.has(path) : inPlay.has(path))
  }
  const { rows, isFolded } = flatten(dirs, {
    collapsed: new Set(collapsed),
    showIgnored,
    ignored: new Set(git.ignored),
    compactFolders: cfg.compactFolders,
    dirCounts: git.dirCounts,
    deleted: new Set(pathsIn(git.files, 'deleted')),
    maxRows: MAX_ROWS,
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
  if (isFolded) lines.push({ key: 'note:fold', kind: 'note', text: `deep folders folded: over ${MAX_ROWS} rows` })
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
  if ((await read($, viewAtom)) === 'file') await closePreview($)
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

const setView = async ($: Dollar, next: PaneView): Promise<void> => {
  await update($, viewAtom, () => next)
  await update($, offsetAtom, () => 0)
  await savePrefs($)
  if (next === 'changes') void refresh($, { walk: false })
}

/** `g`: tree <-> changes; from the peek, back to the changes. */
const toggleChanges = async ($: Dollar): Promise<void> => setView($, (await read($, viewAtom)) === 'changes' ? 'tree' : 'changes')

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
    await focusQuietly($, 'filter')
  } else {
    await update($, filterAtom, () => null)
    await update($, offsetAtom, () => 0)
  }
}

const setFilter = async ($: Dollar, text: string): Promise<void> => {
  await update($, filterAtom, () => text)
  await update($, offsetAtom, () => 0)
}

/** Enter in the filter: preview the best match. */
const previewFirst = async ($: Dollar): Promise<void> => {
  const { lines } = await loadView($, await $.clock.now())
  const first = lines.find(l => l.kind === 'match')
  if (first && first.kind === 'match') await openPreview($, first.path)
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

// ---------- the row cursor ----------

/** Puts the pane's focus ring on `key`, so Enter presses it; a refusal (the pane lacks the keys) is fine, as the mark is drawn either way. */
const focusQuietly = async ($: Dollar, key: string): Promise<void> => {
  try {
    await $.ui.focus({ requestId: PANE, key })
  } catch {
    // nothing to do: the mark is drawn either way
  }
}

/** The lines the cursor stops on: the ones drawn as a pressable row. */
const isStop = (line: Line | undefined): boolean => line !== undefined && (line.kind === 'row' || line.kind === 'change' || line.kind === 'match')

/** The window offset that keeps line `at` in view, a margin from either edge while there are lines beyond. */
const offsetToShow = (at: number, offset: number, visible: number, total: number): number => {
  const margin = Math.max(0, Math.min(CURSOR_MARGIN, Math.floor((visible - 1) / 2)))
  let next = offset
  if (at < offset + margin) next = at - margin
  else if (at > offset + visible - 1 - margin) next = at - visible + 1 + margin
  return clamp(next, 0, Math.max(0, total - visible))
}

/** Moves the focus ring a number of rows, or to the first or last; the window follows it. */
const moveCursor = async ($: Dollar, step: number | 'first' | 'last'): Promise<void> => {
  const now = await $.clock.now()
  const { lines, focused } = await loadView($, now)
  const stops = lines.flatMap((l, i) => (isStop(l) ? [i] : []))
  if (stops.length === 0) return
  const offset = clamp(await read($, offsetAtom), 0, Math.max(0, lines.length - lastVisible))
  const at = lines.findIndex(l => l.key === focused)
  const isInView = at >= offset && at < offset + lastVisible
  let target: number
  if (step === 'first') target = stops[0] as number
  else if (step === 'last') target = stops[stops.length - 1] as number
  else if (!isStop(lines[at]) || !isInView) {
    // no cursor yet, or the wheel took it out of view: land on the first row in view, or the last going up
    const inView = stops.filter(i => i >= offset && i < offset + lastVisible)
    target = (step < 0 ? inView[inView.length - 1] : inView[0]) ?? (stops[0] as number)
  } else {
    target = stops[clamp(stops.indexOf(at) + step, 0, stops.length - 1)] as number
  }
  const key = (lines[target] as Line).key
  lastPersonScrollAt = now // following Claude leaves the window to the person for a moment
  await update($, offsetAtom, () => offsetToShow(target, offset, lastVisible, lines.length))
  await update($, focusedAtom, () => key)
  await focusQuietly($, key)
}

/** The person moved the ring (Tab, a click): the window follows it. */
const showCursor = async ($: Dollar, key: string): Promise<void> => {
  if (lastPlacement !== 'dock') return
  const { lines } = await loadView($, await $.clock.now())
  const at = lines.findIndex(l => l.key === key)
  if (at < 0) return
  const offset = await read($, offsetAtom)
  const next = offsetToShow(at, offset, lastVisible, lines.length)
  if (next !== offset) await update($, offsetAtom, () => next)
}

// ---------- the file preview ----------

const sizeText = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

/** A file's text for the preview, or the note that stands in for it. */
const readPreview = async ($: Dollar, abs: string): Promise<{ text: string | null; note: string | null }> => {
  try {
    const { size } = await $.fs.stat(abs)
    if (size > PREVIEW_MAX_BYTES) return { text: null, note: `too large to preview (${sizeText(size)})` }
    const raw = await $.fs.read(abs)
    if (isBinary(raw)) return { text: null, note: `binary file (${sizeText(size || raw.length)})` }
    if (raw === '') return { text: null, note: 'empty file' }
    // the highlighter takes tab and newline as its only control characters
    const text = raw
      .replace(/\r\n?/g, '\n')
      .replace(/\t/g, '  ')
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    return { text: splitLines(text).slice(0, PREVIEW_MAX_LINES).join('\n'), note: null }
  } catch (err) {
    return { text: null, note: `cannot read: ${err instanceof Error ? err.message : String(err)}` }
  }
}

/** Enter or a click on a file: show it highlighted, in the band above the prompt (or the pane), driven from the tree. */
const openPreview = async ($: Dollar, path: string): Promise<void> => {
  const root = await read($, rootAtom)
  const { text, note } = await readPreview($, absoluteOf(root, path))
  const view = await read($, viewAtom)
  const previous = await read($, previewAtom)
  const back = viewUnder(view, previous)
  const cursor = view === 'file' ? (previous?.cursor ?? null) : await read($, focusedAtom)
  await update($, previewAtom, () => ({ path, text, note, back, cursor }))
  await update($, previewOffsetAtom, () => 0)
  await update($, viewAtom, () => 'file')
}

/** `q`: back to the view the preview came from, the cursor on the row it left. */
const closePreview = async ($: Dollar): Promise<void> => {
  const preview = await read($, previewAtom)
  await update($, viewAtom, () => preview?.back ?? 'tree')
  await update($, previewAtom, () => null)
  await update($, previewOffsetAtom, () => 0)
  const cursor = preview?.cursor
  if (!cursor) return
  await update($, focusedAtom, () => cursor)
  await focusQuietly($, cursor)
}

const scrollPreview = async ($: Dollar, by: number | 'first' | 'last'): Promise<void> => {
  const preview = await read($, previewAtom)
  const total = preview?.text ? splitLines(preview.text).length : 0
  const max = Math.max(0, total - lastPreviewVisible)
  await update($, previewOffsetAtom, o => (by === 'first' ? 0 : by === 'last' ? max : clamp(o + by, 0, max)))
}

/** Claude wrote the file on show: read it again, the scroll kept. */
const rereadPreview = async ($: Dollar, path: string): Promise<void> => {
  const preview = await read($, previewAtom)
  if (!preview || preview.path !== path || (await read($, viewAtom)) !== 'file') return
  const { text, note } = await readPreview($, absoluteOf(await read($, rootAtom), path))
  await update($, previewAtom, p => (p && p.path === path ? { ...p, text, note } : p))
}

// ---------- mention and editor ----------

/** What `m` and `o` act on: the previewed file, else the row under the cursor. */
const targetOf = async ($: Dollar): Promise<{ path: string; isDir: boolean } | undefined> => {
  if ((await read($, viewAtom)) === 'file') {
    const preview = await read($, previewAtom)
    return preview ? { path: preview.path, isDir: false } : undefined
  }
  const key = await read($, focusedAtom)
  if (key?.startsWith('f:')) return { path: key.slice(2), isDir: false }
  if (key?.startsWith('d:')) return { path: key.slice(2), isDir: true }
  return undefined
}

const mentionTarget = async ($: Dollar): Promise<void> => {
  const target = await targetOf($)
  if (!target) return $.ui.toast('tree: move the cursor onto a row first (j/k)')
  await mention($, target.isDir ? `${target.path}/` : target.path)
}

/** The editor command's parts: split on spaces, a part in double quotes kept whole. */
const splitCommand = (command: string): string[] => [...command.matchAll(/"([^"]*)"|(\S+)/g)].map(m => m[1] ?? m[2] ?? '')

const firstLine = (text: string): string => text.trim().split('\n')[0]?.trim() ?? ''

/** Runs the configured editor on a file; GUI editors only, as a terminal one cannot take over Claude's screen. */
const openInEditor = async ($: Dollar, path: string, line: number): Promise<void> => {
  const root = await read($, rootAtom)
  const isWindows = isWindowsPath(root)
  const abs = absoluteOf(root, path)
  const shown = isWindows ? abs.replace(/\//g, '\\') : abs
  const parts = splitCommand(cfg.editor).map(p => p.replaceAll('{path}', shown).replaceAll('{line}', String(line)))
  const head = parts[0]
  if (head === undefined) return $.ui.toast('tree: the editor setting is empty')
  // no shell runs the command, and on Windows `code` is a .cmd script: cmd starts it
  const argv = isWindows && !/\.[A-Za-z0-9]+$/.test(head) ? ['cmd', '/c', ...parts] : parts
  try {
    const ran = await $.process.run(argv, { cwd: root, timeoutMs: EDITOR_TIMEOUT_MS })
    if (ran.exitCode !== 0) $.ui.toast(`tree: editor failed: ${firstLine(ran.stderr) || `exit ${ran.exitCode}`}`)
  } catch (err) {
    $.ui.toast(`tree: editor failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

const openTarget = async ($: Dollar): Promise<void> => {
  const target = await targetOf($)
  if (!target) return $.ui.toast('tree: move the cursor onto a file first (j/k)')
  if (target.isDir) return $.ui.toast('tree: o opens files; Enter folds a folder')
  const line = (await read($, viewAtom)) === 'file' ? (await read($, previewOffsetAtom)) + 1 : 1
  await openInEditor($, target.path, line)
}

const openPane = async ($: Dollar): Promise<boolean> => {
  const opened = await $.ui.open({ id: PANE, title: 'tree', columns: cfg.columns })
  await $.store.delete(`closed:${await $.session.id()}`)
  armPoll($)
  return opened.isPlaced
}

const isPaneOpen = async ($: Dollar): Promise<boolean> => (await $.ui.panes()).some(p => p.id === PANE)

const ensureOpen = async ($: Dollar): Promise<void> => {
  if (!(await isPaneOpen($))) await openPane($)
}

const VERBS = '[changes | find <text> | refresh | reveal <path> | mention <path> | preview <path> | side left|right]'
const usage = `tree: usage: /tree ${VERBS}`

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

/** a badge drawn as a chip: the letter with a cell of tint on each side */
const CHIP_CELLS = 3

/** `chars` cut into runs of neighbours that share a key: one Text each. */
function runsBy<K>(chars: readonly string[], keyOf: (i: number) => K): { text: string; key: K }[] {
  const runs: { text: string; key: K }[] = []
  chars.forEach((ch, i) => {
    const key = keyOf(i)
    const last = runs[runs.length - 1]
    if (last && last.key === key) last.text += ch
    else runs.push({ text: ch, key })
  })
  return runs
}

/** Where a window of `shown` lines from `offset` sits in `total`: just the count when it shows them all. */
const placeText = (offset: number, shown: number, total: number): string =>
  shown === total ? `${total} lines` : `${offset + 1}–${offset + shown}/${total}`

const countsText = (c: LineCounts | undefined): string => (c ? (c.isBinary ? 'bin' : `+${c.added} −${c.removed}`) : '')

const drawPane = async ($: RenderDollar, e: RenderInput<'Pane'>): Promise<RenderElement> => {
  const table = $.ui.resolve(e)
  const { Box, Text, Button, Code } = table
  const Input = 'Input' in table ? table.Input : undefined // the mobile surface draws no field
  const now = await $.clock.now()
  const { root, git, active, trail, showIgnored, view, filter, focusMode, peek, focused, lines, dimKeys } = await loadView($, now)
  const [phase, offsetWanted, preview, previewWanted] = await Promise.all([read($, phaseAtom), read($, offsetAtom), read($, previewAtom), read($, previewOffsetAtom)])
  const isFile = view === 'file' && preview !== null
  /** the preview drawn in this pane; in the band, the pane goes on showing its rows and drives the band */
  const isFileHere = isFile && cfg.previewIn === 'pane'
  const cols = Math.max(16, (e.props.bodyColumns || cfg.columns) - 2 * PAD_X)
  const isDocked = e.props.placement === 'dock'
  const bodyRows = Math.max(4, e.props.scroll.bodyRows || e.viewport?.rows || 24)
  const isFocused = e.props.isFocused
  lastPlacement = e.props.placement

  const activeByPath = new Map<string, ActiveFile>()
  for (const a of active) if (!activeByPath.has(a.path)) activeByPath.set(a.path, a)

  // header: the working directory's name with the focus hint at the right; then the branch and status, or the peeked file;
  // then what Claude is editing
  const titleName = baseName(root) || root
  const focusHint = isFocused ? 'esc to leave' : 'ctrl+x tab to focus'
  const hint = cells(titleName) + 2 + cells(focusHint) <= cols ? focusHint : isFocused ? 'esc' : 'ctrl+x tab'
  const title = truncateMiddle(titleName, Math.max(8, cols - cells(hint) - 2))
  const titlePad = Math.max(1, cols - cells(title) - cells(hint))
  const hasSecondRow = git.isRepo || view === 'peek' || isFile
  const hasFilterRow = filter !== null && view !== 'peek' && view !== 'file'
  const current = active.length > 0 ? active[active.length - 1] : undefined
  const latest = latestOf(trail)
  const lastPath = !current && latest && now - latest[1] < LAST_LINGER_MS ? latest[0] : undefined
  const nowPath = current?.path ?? lastPath
  const headerRows = (hasSecondRow ? 2 : 1) + (hasFilterRow ? 1 : 0) + (nowPath !== undefined ? 1 : 0)

  // the legend: always drawn, pinned under the rows; its keys work while the pane holds the keyboard
  type LegendItem = { key: string; hotkey: string; label: string; run: () => void }
  const legend: LegendItem[] = []
  const hasRows = view === 'tree' || view === 'changes'
  const isWholeTree = view === 'tree' && filter === null
  if (isFile) {
    legend.push({ key: 'act:close', hotkey: 'q', label: 'back', run: () => void closePreview($) })
  } else {
    if (view === 'peek') legend.push({ key: 'act:changes', hotkey: 'g', label: 'back', run: () => void closePeek($) })
    else legend.push({ key: 'act:changes', hotkey: 'g', label: view === 'changes' ? 'tree' : 'changes', run: () => void toggleChanges($) })
    if (view !== 'peek') legend.push({ key: 'act:filter', hotkey: 'f', label: filter === null ? 'find' : 'close', run: () => void toggleFilter($) })
    if (isWholeTree) {
      legend.push({ key: 'act:focus', hotkey: 'z', label: focusMode ? 'all' : 'focus', run: () => void toggleFocus($) })
      legend.push({ key: 'act:ignored', hotkey: 'h', label: showIgnored ? 'hide ignored' : 'ignored', run: () => void toggleIgnored($) })
    }
    legend.push({ key: 'act:refresh', hotkey: 'r', label: 'refresh', run: () => void refresh($, { walk: true }) })
    if (isWholeTree) {
      legend.push({ key: 'act:collapse', hotkey: 'c', label: 'fold', run: () => void collapseAll($) })
      legend.push({ key: 'act:expand', hotkey: 'e', label: 'unfold', run: () => void expandAll($) })
    }
  }
  if (isFile || hasRows) {
    // j and k scroll the file while one shows, else move the cursor
    const step = (by: number) => () => void (isFile ? scrollPreview($, by) : moveCursor($, by))
    legend.push({ key: 'act:mention', hotkey: 'm', label: 'mention', run: () => void mentionTarget($) })
    legend.push({ key: 'act:open', hotkey: 'o', label: 'editor', run: () => void openTarget($) })
    legend.push({ key: 'act:down', hotkey: 'j', label: '↓', run: step(1) })
    legend.push({ key: 'act:up', hotkey: 'k', label: '↑', run: step(-1) })
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
  // the preview always owns its window, inline too: a whole file is never handed to the engine
  const isOwnWindow = isDocked || isFileHere
  const fileLines = isFileHere && preview.text !== null ? splitLines(preview.text) : []
  const total = isFileHere ? fileLines.length : lines.length
  const visible = isOwnWindow ? Math.max(1, bodyRows - headerRows - PAD_ROWS - legendRows) : lines.length
  if (isFileHere) lastPreviewVisible = visible
  else lastVisible = visible
  const maxOffset = Math.max(0, total - visible)
  const offset = clamp(isFileHere ? previewWanted : offsetWanted, 0, maxOffset)
  const shown = isFileHere ? [] : isDocked ? lines.slice(offset, offset + visible) : lines
  const fileShown = fileLines.slice(offset, offset + visible)
  /** the rows the body draws before its padding: the lines, the file's lines, or the one note */
  const bodyCount = isFileHere ? (preview.text === null ? 1 : fileShown.length) : shown.length
  const padRows = isOwnWindow ? Math.max(0, visible - bodyCount) : 0
  const hiddenAbove = isOwnWindow ? offset : 0
  const hiddenBelow = isOwnWindow ? Math.max(0, total - offset - visible) : 0
  const hasBar = isOwnWindow && maxOffset > 0
  const rowCols = hasBar ? cols - 2 : cols // the scrollbar takes a cell, with one of space before it
  const thumbLen = hasBar ? Math.max(1, Math.round((visible * visible) / total)) : 0
  const thumbStart = hasBar ? Math.round((offset / maxOffset) * (visible - thumbLen)) : 0

  // ---- the glass: every drawn row has a place on the slab, top to bottom, and its color comes from there ----
  const pal = glassPalette(cfg.accent, isLightTheme)
  /** what a hover's lift or the legend's shelf moves toward: the light on a dark slab, the shade on a light one */
  const toward = pal.isLight ? BLACK : WHITE
  const bodyStart = headerRows + 1 // the top cue row sits between the header and the lines
  const legendStart = bodyStart + bodyCount + padRows + 1
  const slabRows = legendStart + legendRows
  /** the slab's color under drawn row `i`; with the glass off, the background the theme most likely has */
  const slab = (i: number): Rgb => (cfg.glass ? glassRow(pal, i, slabRows) : pal.base)
  /** an edge cell's color: partly the terminal's own background, so the glass has no hard border */
  const featherOf = (c: Rgb): Rgb => (cfg.glass ? feather(pal, c) : c)
  /** a row's background: the slab with the glass on; with it off, only a tint that differs from the plain background */
  const bgFor = (rgb: Rgb, i: number): string | undefined => {
    const hex = toHex(rgb)
    return cfg.glass || hex !== toHex(slab(i)) ? hex : undefined
  }
  /** the dusk, from the accent at 0 to the violet at 1 */
  const duskAt = (t: number): Rgb => ramp([pal.accent, pal.violet], t)
  /** along the dusk, 0 at the top of the pane and 1 at the bottom */
  const dusk = (i: number): Rgb => duskAt(slabRows <= 1 ? 0 : i / (slabRows - 1))
  const hex = (rgb: Rgb): string => toHex(rgb)
  const silver = hex(pal.silver)
  /** a row's hover: its glass lifted toward the light */
  const lifted = (under: Rgb): { backgroundColor: string } => ({ backgroundColor: hex(mix(under, toward, pal.lift)) })
  /** 0 to 1 and back over `period` shimmer ticks */
  const breathe = (period: number): number => (1 - Math.cos((2 * Math.PI * phase) / period)) / 2

  // the ember glow: a soft bell of light around the file Claude is writing, laid over the slab, fading for a moment after
  const glowing = active.find(a => !a.isRead)
  const glowFactor = glowing ? 1 : latest && now - latest[1] < GLOW_FADE_MS ? 1 - (now - latest[1]) / GLOW_FADE_MS : 0
  const glowPath = glowing ? glowing.path : latest ? latest[0] : ''
  const glowKey = isAbsolute(glowPath) ? `o:${glowPath}` : `f:${glowPath}`
  const glowAt = cfg.glow && glowFactor > 0 ? shown.findIndex(l => l.key === glowKey) : -1
  /** how lit a shown line's rim is: the glowing row's brightest, its neighbours less */
  const litOf = (s: number): number => (glowAt < 0 ? 0 : glowWeight(s - glowAt) * glowFactor)
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

  /** What lies under a shown line: the slab, a diff line's green or red, a ripple's wash, and the glow over all of it. */
  const lineUnder = (s: number, line: Line): Rgb => {
    let under = slab(bodyStart + s)
    if (line.kind === 'diff') {
      const t = line.text
      if (t.startsWith('+') && !t.startsWith('+++')) under = mix(under, pal.added, pal.isLight ? 0.08 : 0.1)
      else if (t.startsWith('-') && !t.startsWith('---')) under = mix(under, pal.removed, pal.isLight ? 0.08 : 0.1)
    }
    if (dimKeys.has(line.key)) under = mix(under, pal.accent, 0.08) // a fold ripple passes like a wave of light
    if (glowAt >= 0) under = glowOver(pal, under, s - glowAt, glowFactor)
    return under
  }

  /** a hairline's runs: `len` cells of `─` starting `start` cells in, bright where the light enters and fading into the glass */
  const hairRuns = (start: number, len: number, width: number, under: Rgb, isFromRight: boolean): RenderElement[] => {
    const out: RenderElement[] = []
    const runs = Math.max(1, Math.min(len, Math.ceil(len / 3)))
    for (let k = 0; k < runs; k++) {
      const from = Math.floor((k * len) / runs)
      const to = Math.floor(((k + 1) * len) / runs)
      if (to <= from) continue
      const x = (start + (from + to) / 2) / Math.max(1, width)
      const f = isFromRight ? 1 - x : x
      const strength = (pal.isLight ? 0.55 : 0.7) * (1 - smoothstep(f))
      out.push(<Text color={hex(mix(under, duskAt(f), strength))}>{'─'.repeat(to - from)}</Text>)
    }
    return out
  }

  /** A soft pill: half-block caps in a tint of the hue, the text on that tint. */
  const pill = (text: string, hue: Rgb, fg: Color, under: Rgb): RenderElement[] => {
    const tint = hex(mix(under, hue, pal.isLight ? 0.18 : 0.26))
    return [
      <Text color={tint}>▐</Text>,
      <Text color={fg} backgroundColor={tint}>
        {text}
      </Text>,
      <Text color={tint}>▌</Text>,
    ]
  }

  /** The light that moves through a name while Claude has the file open: moonlight for a read, an ember for a write. */
  const shimmer = (name: string, a: ActiveFile): RenderElement[] => {
    const [dim, hot] = a.isRead ? pal.moon : pal.ember
    if (cfg.shimmer === 'off') return [<Text color={hex(hot)} bold>{name}</Text>]
    if (cfg.shimmer === 'pulse') {
      // one breath a second
      return [
        <Text color={hex(mix(dim, hot, breathe(10)))} bold={!a.isRead}>
          {name}
        </Text>,
      ]
    }
    // a soft band of light sweeps through, entering and leaving fully; neighbouring cells of one shade draw as one run
    const chars = [...name]
    const head = (phase % (chars.length + 6)) - 3
    return runsBy(chars, i => Math.round(sweepAt(i, head) * 4)).map(r => (
      <Text color={hex(mix(dim, hot, r.key / 4))} bold={r.key >= 2}>
        {r.text}
      </Text>
    ))
  }

  /** the breathing `●`'s color, in step with its glyph: the accent warming toward the ember's brightest and back */
  const breath = hex(mix(pal.accent, pal.ember[1], 0.7 * breathe(9)))
  const readDot = hex(mix(pal.moon[0], pal.moon[1], 0.5))

  const glyphFor = (path: string, isDir: boolean, isOpen: boolean): { glyph: string; color: string; a: ActiveFile | undefined } => {
    const a = activeByPath.get(path)
    const touched = trail[path]
    if (isDir) return { glyph: isOpen ? '▾' : '▸', color: hex(mix(pal.accent, pal.silver, 0.45)), a: undefined }
    if (a) return { glyph: a.isRead ? '●' : (BREATH[Math.floor(phase / 3) % BREATH.length] as string), color: a.isRead ? readDot : breath, a }
    if (touched !== undefined) {
      // an afterglow: the ember cools through violet to a faint silver over the trail's fade
      const t = smoothstep((now - touched) / TRAIL_FADE_MS)
      return { glyph: '·', color: hex(ramp([pal.accent, mix(pal.violet, pal.silver, 0.5), mix(pal.silver, pal.base, 0.55)], t)), a: undefined }
    }
    return { glyph: ' ', color: silver, a: undefined }
  }

  const press = (row: Row) => () => {
    void (row.kind === 'dir' ? toggleDir($, row.path) : openPreview($, row.path))
  }

  /**
   * The cell at the left edge of every row: the glass feathered toward the terminal, so the slab fades in rather than
   * starting at a border, and lit by the glow beside the file Claude writes; while the pane holds the keyboard, a light
   * pipe down the whole pane, thicker on the row the focus ring is on, so a glance says whether the hotkeys will land here
   * or in the prompt.
   */
  const edge = (i: number, key?: string, lit = 0, under: Rgb = slab(i)): RenderElement => {
    const isMark = key !== undefined && focused === key
    const rim = mix(featherOf(under), pal.accent, 0.6 * lit)
    return (
      <Text color={hex(isMark ? pal.accent : dusk(i))} backgroundColor={bgFor(rim, i)}>
        {isFocused ? (isMark ? '▍' : '▏') : ' '}
      </Text>
    )
  }

  /** The cell at the right edge of every row, feathered like the left one; the row's content fills up to it. */
  const rightEdge = (i: number, under: Rgb = slab(i)): RenderElement => <Text backgroundColor={bgFor(featherOf(under), i)}> </Text>

  const drawRow = (row: Row, under: Rgb): RenderElement => {
    const indent = 2 * row.depth // one faint guide per level, `│ `, in the indent cells
    const lit = litLevel.get(row.key)
    const { glyph, color: glyphColor, a } = glyphFor(row.path, row.kind === 'dir', row.isOpen)
    const state = git.files[row.path]
    const badge = row.kind === 'dir' ? (!row.isOpen && row.count > 0 ? String(row.count) : '') : state ? BADGE[state] : ''
    const isChip = row.kind === 'file' && badge !== ''
    const badgeCells = isChip ? CHIP_CELLS : cells(badge)
    const nameRoom = rowCols - indent - 2 - (badge ? badgeCells + 1 : 0)
    const name = truncateMiddle(row.name, Math.max(1, nameRoom))
    const isTruncated = name !== row.name
    const pad = Math.max(1, rowCols - indent - 2 - cells(name) - badgeCells)
    const nameColor: Color | undefined = row.kind === 'dir' ? undefined : state ? COLOR[state] : undefined
    const isStruck = row.isMissing || state === 'deleted'
    const isDim = row.isIgnored || dimKeys.has(row.key) // ignored, or arriving or leaving in a ripple
    const dot = row.kind === 'file' && !isTruncated ? name.lastIndexOf('.') : -1
    const nameNodes: RenderElement[] = a
      ? shimmer(name, a)
      : row.kind === 'dir'
        ? [
            <Text color={hex(pal.folder)} bold dimColor={isDim}>
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
    // each level's guide takes a step along the dusk, faint, so depth reads as color rather than clutter
    const guideColor = (level: number): string => hex(mix(under, duskAt(Math.min(1, level / 4)), pal.isLight ? 0.42 : 0.3))
    return (
      <Box key={`h:${row.key}`} flexDirection="row" flexGrow={1} hover={lifted(under)}>
        <Button plain key={row.key} onPress={press(row)} hover={{ bold: true, dimColor: false }}>
          {Array.from({ length: row.depth }, (_, level) => (
            <Text color={level === lit ? hex(pal.accent) : guideColor(level)}>│ </Text>
          ))}
          <Text color={glyphColor} dimColor={isDim && !a}>
            {glyph}
          </Text>{' '}
          {nameNodes}
        </Button>
        {badge ? <Text>{' '.repeat(pad)}</Text> : null}
        {isChip && state ? (
          <Text backgroundColor={hex(mix(under, pal.hues[state], pal.isLight ? 0.16 : 0.22))}>
            {' '}
            <Text color={COLOR[state]} bold>
              {badge}
            </Text>{' '}
          </Text>
        ) : badge ? (
          <Text color={hex(mix(under, duskAt(Math.min(1, row.depth / 4)), 0.7))}>{badge}</Text>
        ) : null}
        {isTruncated ? (
          <Box position="absolute" top={0} left={indent + 2} display="none" hover={{ display: 'flex' }}>
            <Text inverse>{row.name}</Text>
          </Box>
        ) : null}
      </Box>
    )
  }

  const counts = (c: LineCounts | undefined): RenderElement | null => {
    if (!c) return null
    if (c.isBinary) return <Text color={silver}>bin</Text>
    return (
      <Text>
        <Text color={hex(pal.added)}>+{c.added}</Text> <Text color={hex(pal.removed)}>−{c.removed}</Text>
      </Text>
    )
  }

  const drawChange = (path: string, state: GitState, under: Rgb): RenderElement => {
    const { glyph, color: glyphColor, a } = glyphFor(path, false, false)
    const countsShown = countsText(git.numstat[path])
    const room = rowCols - 2 - (countsShown ? cells(countsShown) + 1 : 0) - 2
    const shownPath = shortenPath(path, Math.max(1, room))
    const pad = Math.max(1, rowCols - 2 - cells(shownPath) - cells(countsShown) - 2)
    return (
      <Box key={`h:f:${path}`} flexDirection="row" flexGrow={1} hover={lifted(under)}>
        <Button plain key={`f:${path}`} onPress={() => void openPreview($, path)} hover={{ bold: true, dimColor: false }}>
          <Text color={glyphColor}>{glyph}</Text> {a ? shimmer(shownPath, a) : <Text color={COLOR[state]} strikethrough={state === 'deleted'}>{shownPath}</Text>}
        </Button>
        <Text>{' '.repeat(pad)}</Text>
        {counts(git.numstat[path])}
        <Text> </Text>
        <Button plain key={`pk:${path}`} onPress={() => void openPeek($, path)} hover={{ bold: true }}>
          <Text color={hex(pal.accent)}>±</Text>
        </Button>
      </Box>
    )
  }

  const drawMatch = (path: string, indices: number[], under: Rgb): RenderElement => {
    const { glyph, color: glyphColor, a } = glyphFor(path, false, false)
    const state = git.files[path]
    const badge = state ? BADGE[state] : ''
    const room = rowCols - 2 - (badge ? 2 : 0)
    const shownPath = truncateStart(path, Math.max(1, room))
    const shift = path.length - shownPath.length // where the path's chars sit in the shown one, past the ellipsis that stands for the cut
    const hit = new Set(indices.map(i => i - shift))
    const parts = runsBy([...shownPath], i => hit.has(i)).map(r =>
      r.key ? (
        <Text color="claude" bold>
          {r.text}
        </Text>
      ) : (
        <Text color={state ? COLOR[state] : undefined}>{r.text}</Text>
      ),
    )
    const pad = Math.max(1, rowCols - 2 - cells(shownPath) - cells(badge))
    return (
      <Box key={`h:f:${path}`} flexDirection="row" flexGrow={1} hover={lifted(under)}>
        <Button plain key={`f:${path}`} onPress={() => void openPreview($, path)} hover={{ bold: true, dimColor: false }}>
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
    if (text.startsWith('@@')) return <Text color={hex(mix(pal.violet, pal.silver, 0.4))}>{shownText}</Text>
    if (text.startsWith('+')) return <Text color="diffAdded">{shownText}</Text>
    if (text.startsWith('-')) return <Text color="diffRemoved">{shownText}</Text>
    return <Text>{shownText}</Text>
  }

  const drawLine = (line: Line, under: Rgb): RenderElement => {
    switch (line.kind) {
      case 'row':
        return drawRow(line.row, under)
      case 'note':
        return (
          <Text color={silver} italic>
            {line.text}
          </Text>
        )
      case 'outsideHead':
        return <Text color={silver}>⋯ outside project</Text>
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
      case 'group': {
        // a heading with a hairline running out of it
        const used = cells(line.label) + 1
        return (
          <Box flexDirection="row">
            <Text color={silver} bold>
              {line.label}
            </Text>
            <Text> </Text>
            {hairRuns(used, Math.max(0, rowCols - used), rowCols, under, false)}
          </Box>
        )
      }
      case 'change':
        return drawChange(line.path, line.state, under)
      case 'match':
        return drawMatch(line.path, line.indices, under)
      case 'diff':
        return drawDiff(line.text)
    }
  }

  /** The scrollbar's cell beside shown line `s`: the thumb carries the dusk along its length; the track is barely there. */
  const barCell = (s: number, under: Rgb): RenderElement => {
    const isThumb = s >= thumbStart && s < thumbStart + thumbLen
    const color = isThumb ? duskAt(thumbLen <= 1 ? 0.5 : (s - thumbStart) / (thumbLen - 1)) : mix(under, pal.silver, 0.22)
    return <Text color={hex(color)}>{isThumb ? '┃' : '│'}</Text>
  }

  /** A shown line: the rim, the line on its slab and glow, and the scrollbar cell at the right edge while the lines overflow. */
  const drawShown = (line: Line, s: number): RenderElement => {
    const i = bodyStart + s
    const isCursor = isFocused && focused === line.key
    const base = lineUnder(s, line)
    const under = isCursor ? mix(base, toward, pal.lift) : base // the cursor row stays lit as a hover would
    const el = drawLine(line, under)
    return (
      <Box flexDirection="row" backgroundColor={bgFor(under, i)}>
        {edge(i, line.key, litOf(s), under)}
        {hasBar ? <Box width={rowCols}>{el}</Box> : <Box flexGrow={1}>{el}</Box>}
        {hasBar ? <Text> </Text> : null}
        {hasBar ? barCell(s, under) : null}
        {rightEdge(i, under)}
      </Box>
    )
  }

  /**
   * The preview's body: the window's lines on the engine's highlighter, with a gutter numbering them, cut at the edge so
   * a line is a row; the edge cells and the scrollbar run down beside it, each on its own row's glass.
   */
  const drawFile = (p: Preview): RenderElement => {
    const rows = Array.from({ length: bodyCount }, (_, s) => bodyStart + s)
    const mid = slab(bodyStart + Math.floor(bodyCount / 2))
    return (
      <Box key="b:file" flexDirection="row">
        <Box flexDirection="column">{rows.map(i => edge(i))}</Box>
        <Box flexDirection="column" width={hasBar ? rowCols : cols} height={bodyCount} backgroundColor={bgFor(mid, bodyStart)}>
          {p.text === null ? (
            <Text color={silver} italic>
              {p.note ?? ''}
            </Text>
          ) : (
            <Code source={fileShown.join('\n')} path={p.path} startLine={offset + 1} wrap="truncate-end" />
          )}
        </Box>
        {hasBar ? (
          <Box flexDirection="column">
            {rows.map((i, s) => (
              <Text backgroundColor={bgFor(slab(i), i)}>
                {' '}
                {barCell(s, slab(i))}
              </Text>
            ))}
          </Box>
        ) : null}
        <Box flexDirection="column">{rows.map(i => rightEdge(i))}</Box>
      </Box>
    )
  }

  /** A cue row: a hairline of light, with the count of rows out of view sitting in it. */
  const drawCue = (i: number, hidden: number, arrow: '↑' | '↓', isFromRight: boolean): RenderElement => {
    const under = slab(i)
    const label = hidden > 0 ? `${arrow} ${hidden} more` : ''
    const lead = label ? 2 : 0
    const used = label ? lead + cells(label) + 1 : 0
    return (
      <Box flexDirection="row" backgroundColor={bgFor(under, i)}>
        {edge(i)}
        {label ? hairRuns(0, lead, cols, under, isFromRight) : null}
        {label ? <Text color={silver}>{label}</Text> : null}
        {label ? <Text> </Text> : null}
        {hairRuns(used, cols - used, cols, under, isFromRight)}
        <Box flexGrow={1} />
        {rightEdge(i)}
      </Box>
    )
  }

  // the title row: where the light first lands, its top edge already fading into the terminal
  const titleUnder = slab(0)
  const titleRuns = gradientRuns(title, isFocused ? pal.title : pal.titleSoft, 24)

  // branch row: branch on the left, status in a pill on the right
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
  const pillCells = right ? cells(right) + 2 : 0
  const leftText = truncateMiddle(left, Math.max(4, cols - pillCells - 1))
  const headerPad = Math.max(1, cols - cells(leftText) - pillCells)
  const rightColor: Color = git.failed ? 'error' : dirty > 0 ? 'warning' : 'success'
  const rightHue: Rgb = git.failed ? pal.hues.conflicted : dirty > 0 ? pal.hues.modified : pal.hues.clean

  // peek row: the file and its counts, pressable to go back
  const peekCounts = peek ? countsText(git.numstat[peek]) : ''
  const peekPath = peek ? shortenPath(peek, Math.max(1, cols - 2 - (peekCounts ? cells(peekCounts) + 1 : 0))) : ''

  // file row: the previewed file, pressable to go back, and where the window is in it
  const fileState = isFile ? git.files[preview.path] : undefined
  const filePlace = !isFile
    ? ''
    : !isFileHere
      ? 'below ↙' // the band above the prompt shows it, with its own position
      : preview.text === null
        ? ''
        : placeText(offset, fileShown.length, fileLines.length)
  const filePath = isFile ? shortenPath(preview.path, Math.max(1, cols - 2 - (filePlace ? cells(filePlace) + 1 : 0)), homeDir) : ''
  const filePad = Math.max(1, cols - 2 - cells(filePath) - cells(filePlace))

  // now-editing row: the file Claude has open, with the shimmer; else the one it just closed, dim, for a few seconds
  const nowShown = nowPath !== undefined ? shortenPath(nowPath, Math.max(1, cols - 2 - (current ? 0 : 6)), homeDir) : ''

  // where each header row sits on the slab
  const secondAt = 1
  const nowAt = hasSecondRow ? 2 : 1
  const filterAt = nowAt + (nowPath !== undefined ? 1 : 0)

  return (
    <Box flexDirection="column">
      <Box key="h:title" flexDirection="row" backgroundColor={bgFor(titleUnder, 0)}>
        {edge(0, undefined, 0, titleUnder)}
        <Text bold>
          {titleRuns.map(r => (
            <Text color={r.color}>{r.text}</Text>
          ))}
        </Text>
        <Text>{' '.repeat(titlePad)}</Text>
        <Text color={isFocused ? hex(pal.accent) : silver} dimColor={!isFocused}>
          {hint}
        </Text>
        <Box flexGrow={1} />
        {rightEdge(0, titleUnder)}
        <Box position="absolute" top={0} left={PAD_X} display="none" hover={{ display: 'flex' }}>
          <Text inverse>{shortenPath(root, cols, homeDir)}</Text>
        </Box>
      </Box>
      {isFile ? (
        <Box key="h:file" flexDirection="row" backgroundColor={bgFor(slab(secondAt), secondAt)}>
          {edge(secondAt)}
          <Button plain key="act:back" onPress={() => void closePreview($)} hover={{ bold: true }}>
            <Text color={hex(pal.accent)}>‹</Text> <Text color={fileState ? COLOR[fileState] : undefined}>{filePath}</Text>
          </Button>
          <Text>{' '.repeat(filePad)}</Text>
          <Text color={silver}>{filePlace}</Text>
          <Box flexGrow={1} />
          {rightEdge(secondAt)}
        </Box>
      ) : view === 'peek' && peek !== null ? (
        <Box key="h:peek" flexDirection="row" backgroundColor={bgFor(slab(secondAt), secondAt)}>
          {edge(secondAt)}
          <Button plain key="act:back" onPress={() => void closePeek($)} hover={{ bold: true }}>
            <Text color={hex(pal.accent)}>±</Text> <Text color={git.files[peek] ? COLOR[git.files[peek] as GitState] : undefined}>{peekPath}</Text>
          </Button>
          {peekCounts ? <Text> </Text> : null}
          {counts(git.numstat[peek])}
          <Box flexGrow={1} />
          {rightEdge(secondAt)}
        </Box>
      ) : git.isRepo ? (
        <Box flexDirection="row" backgroundColor={bgFor(slab(secondAt), secondAt)}>
          {edge(secondAt)}
          <Text color={silver}>{leftText}</Text>
          <Text>{' '.repeat(headerPad)}</Text>
          {right ? pill(right, rightHue, rightColor, slab(secondAt)) : null}
          <Box flexGrow={1} />
          {rightEdge(secondAt)}
        </Box>
      ) : null}
      {nowPath !== undefined ? (
        <Box key="h:now" flexDirection="row" backgroundColor={bgFor(slab(nowAt), nowAt)} hover={lifted(slab(nowAt))}>
          {edge(nowAt, 'act:now')}
          <Button plain key="act:now" onPress={() => void jumpTo($, nowPath)} hover={{ bold: true, dimColor: false }}>
            {current ? <Text color={current.isRead ? readDot : breath}>●</Text> : <Text color={silver}>·</Text>}{' '}
            {current ? shimmer(nowShown, current) : <Text dimColor>last: {nowShown}</Text>}
          </Button>
          <Box flexGrow={1} />
          {rightEdge(nowAt)}
        </Box>
      ) : null}
      {hasFilterRow ? (
        <Box key="h:filter" flexDirection="row" backgroundColor={bgFor(slab(filterAt), filterAt)}>
          {edge(filterAt, 'filter')}
          <Text color={hex(pal.accent)}>› </Text>
          {Input ? (
            <Input
              key="filter"
              value={filter ?? ''}
              placeholder="type to find"
              submitLabel="preview"
              autoFocus
              onInput={value => void setFilter($, value)}
              onSubmit={() => void previewFirst($)}
            />
          ) : (
            <Text dimColor>{filter || 'use /tree find <text>'}</Text>
          )}
          <Text> </Text>
          <Button plain key="act:clear" onPress={() => void toggleFilter($)} dimColor hover={{ dimColor: false }}>
            ×
          </Button>
          <Box flexGrow={1} />
          {rightEdge(filterAt)}
        </Box>
      ) : null}
      {drawCue(bodyStart - 1, hiddenAbove, '↑', false)}
      {isFileHere ? drawFile(preview) : shown.map((line, s) => drawShown(line, s))}
      {Array.from({ length: padRows }, (_, j) => {
        const i = bodyStart + bodyCount + j
        return (
          <Box flexDirection="row" backgroundColor={bgFor(slab(i), i)}>
            {edge(i)}
            <Text> </Text>
            <Box flexGrow={1} />
            {rightEdge(i)}
          </Box>
        )
      })}
      {drawCue(legendStart - 1, hiddenBelow, '↓', true)}
      {legendLines.map((items, k) => {
        // the legend sits on a shelf, a touch brighter than the slab around it
        const i = legendStart + k
        const shelf = mix(slab(i), toward, cfg.glass ? pal.shelf : 0)
        return (
          <Box flexDirection="row" backgroundColor={bgFor(shelf, i)}>
            {edge(i, undefined, 0, shelf)}
            <Box flexDirection="row" columnGap={LEGEND_GAP}>
              {items.map(l => (
                <Button plain hotkey={l.hotkey} key={l.key} dimColor={!isFocused} onPress={l.run}>
                  {l.label}
                </Button>
              ))}
            </Box>
            <Box flexGrow={1} />
            {rightEdge(i, shelf)}
          </Box>
        )
      })}
      {/* one row past the body, never shown: it keeps the engine's scroll keys live, and the ui.scroll hook turns them into the pane's own window */}
      {isOwnWindow ? <Text> </Text> : null}
    </Box>
  )
}

/** A hint, its parts dropped from the end while it is wider than `room`. */
const fitHint = (parts: string[], room: number): string => {
  for (let n = parts.length; n > 0; n--) {
    const text = parts.slice(0, n).join('  ')
    if (cells(text) <= room) return text
  }
  return ''
}

/**
 * The preview in the band above the prompt, where plan mode and the questions show: as wide as the transcript and as
 * tall as the band may be (half the terminal at most). The tree pane keeps the keyboard and drives it.
 */
const drawBand = async ($: RenderDollar, e: RenderInput<'AbovePrompt'>): Promise<RenderElement | undefined> => {
  const [view, preview, offsetWanted] = await Promise.all([read($, viewAtom), read($, previewAtom), read($, previewOffsetAtom)])
  if (view !== 'file' || preview === null || cfg.previewIn !== 'band' || e.props.hasSurvey) return undefined
  const { Box, Text, Code } = $.ui.resolve(e)
  const pal = glassPalette(cfg.accent, isLightTheme)
  const cols = Math.max(20, e.props.bodyColumns)
  const lines = preview.text === null ? [] : splitLines(preview.text)
  // less the border's two rows, the header row and the cue row, so the band shows it whole
  const visible = Math.max(1, e.props.maxRows - 2 - BAND_BORDER * 2)
  lastPreviewVisible = visible
  const offset = clamp(offsetWanted, 0, Math.max(0, lines.length - visible))
  const shown = lines.slice(offset, offset + visible)
  const below = Math.max(0, lines.length - offset - shown.length)
  const place = preview.text === null ? '' : placeText(offset, shown.length, lines.length)
  const state = (await read($, gitAtom)).files[preview.path]
  const path = shortenPath(preview.path, Math.max(8, Math.floor(cols / 2)), homeDir)
  const inner = cols - 2 * BAND_BORDER - 2 * BAND_PAD_X // the frame and the cell of room inside it on each side
  const hint = fitHint(['in the tree:', 'j k ↑ ↓ PgUp PgDn scroll', 'm mention', 'o editor', 'q close'], inner - cells(path) - cells(place) - 4)
  const cue = [offset > 0 ? `↑ ${offset} above` : '', below > 0 ? `↓ ${below} more` : ''].filter(Boolean).join('   ')
  return (
    <Box flexDirection="column" width={cols} borderStyle="round" borderColor={toHex(pal.accent)} paddingX={BAND_PAD_X}>
      <Box flexDirection="row">
        <Text color={toHex(pal.accent)}>▍</Text>
        <Text color={state ? COLOR[state] : toHex(pal.accent)} bold>
          {path}
        </Text>
        <Text>{'  '}</Text>
        <Text color={toHex(pal.silver)}>{place}</Text>
        <Box flexGrow={1} />
        <Text dimColor>{hint}</Text>
      </Box>
      {preview.text === null ? (
        <Text color={toHex(pal.silver)} italic>
          {preview.note ?? ''}
        </Text>
      ) : (
        <Box height={shown.length}>
          <Code source={shown.join('\n')} path={preview.path} startLine={offset + 1} wrap="truncate-end" />
        </Box>
      )}
      <Text color={toHex(pal.silver)} dimColor>
        {cue || ' '}
      </Text>
    </Box>
  )
}

// ---------- hooks ----------

export const register: Register = (on, options) => {
  cfg = readConfig(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tree',
      description: 'File tree pane: toggle it, or changes, find <text>, refresh, reveal <path>, mention <path>, preview <path>, side left|right',
      argumentHint: VERBS,
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
        if (await isPaneOpen($)) {
          await $.ui.close({ id: PANE })
          return { text: 'tree: closed.' }
        }
        const isPlaced = await openPane($)
        void refresh($, { walk: true })
        return { text: isPlaced ? 'tree: opened.' : 'tree: opened; it shows once the terminal is wide enough (110 columns in fullscreen).' }
      }
      case 'changes': {
        await ensureOpen($)
        await setView($, 'changes')
        return { text: 'tree: showing the changes.' }
      }
      case 'find': {
        await ensureOpen($)
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
      case 'preview': {
        if (!arg) return { text: 'tree: preview needs a path.' }
        const rel = relativeTo(await read($, rootAtom), arg) ?? toPosix(arg) // outside the root, the absolute path
        await ensureOpen($)
        await openPreview($, rel)
        return { text: `tree: previewing ${rel}.` }
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
    await update($, activeAtom, list => [...list, { path, toolUseId: e.tool_use_id, tool: String(e.tool), isRead }])
    if (rel !== null && cfg.followClaude) void reveal($, rel)
    armShimmer($)
    try {
      return await next(e)
    } finally {
      const ended = await $.clock.now()
      await update($, activeAtom, list => list.filter(a => a.toolUseId !== e.tool_use_id))
      await update($, trailAtom, t => ({ ...t, [path]: ended }))
      armTrail($)
      if (!isRead) {
        scheduleRefresh($, rel === null ? undefined : parentOf(rel))
        void rereadPreview($, path)
      }
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

  // The file preview, above the prompt; any other time the band is left to the rest.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => (await drawBand($, e)) ?? next(e))

  // The wheel over the band scrolls the file it shows.
  on('ui.scroll', { component: 'AbovePrompt' }, async ($, e, next) => {
    if ((await read($, viewAtom)) !== 'file' || cfg.previewIn !== 'band') return next(e)
    await scrollPreview($, e.by)
    return {}
  })

  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person') await $.store.set(`closed:${await $.session.id()}`, true)
    if ((await read($, viewAtom)) === 'file') {
      // a preview does not outlive its pane: it opens again on the view under it, at the tree's width
      const back = viewUnder('file', await read($, previewAtom))
      await update($, viewAtom, () => back)
      await update($, previewAtom, () => null)
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

  // The focus ring's element is the row cursor; when the person moves it (Tab, a click), the window follows.
  on('ui.focus', { requestId: PANE }, async ($, e, next) => {
    await update($, focusedAtom, () => e.element ?? null)
    const moved = await next(e)
    if (e.origin.kind === 'person' && e.element !== undefined) await showCursor($, e.element)
    return moved
  })

  // Docked, the pane owns its window: the engine's move is answered with the pane's own, and the engine's window stays put.
  // The person's scroll keys carry no pointer cell, and those move the cursor (or, in the preview, the lines); the wheel
  // scrolls. One row is an arrow, a body's height a page key, more than that Home or End.
  on('ui.scroll', { requestId: PANE }, async ($, e, next) => {
    const isPerson = e.origin.kind === 'person'
    if (isPerson) lastPersonScrollAt = await $.clock.now()
    const isJump = Math.abs(e.by) > e.bodyRows
    const isPage = !isJump && Math.abs(e.by) === e.bodyRows && e.bodyRows > 1
    /** the key's move over a window of `visible` lines: to an end, a page (less a line kept for context), or as many as asked */
    const stepOver = (visible: number) => (isJump ? (e.by < 0 ? ('first' as const) : ('last' as const)) : isPage ? Math.sign(e.by) * Math.max(1, visible - 1) : e.by)
    // while a file shows, the keys scroll it; the wheel too, but over the pane's rows when the band shows the file
    const isWheelOverRows = cfg.previewIn === 'band' && e.pointer !== undefined
    if ((await read($, viewAtom)) === 'file' && !isWheelOverRows) {
      await scrollPreview($, stepOver(lastPreviewVisible))
      return {}
    }
    if (lastPlacement !== 'dock') return next(e)
    if (isPerson && e.pointer === undefined) {
      await moveCursor($, stepOver(lastVisible))
      return {}
    }
    await scrollBy($, e.by, isJump)
    return {}
  })
}
