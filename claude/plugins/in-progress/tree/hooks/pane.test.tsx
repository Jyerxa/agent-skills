import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

const ROOT = '/repo'

type Entry = { name: string; kind: 'file' | 'dir' }

const FILES: Record<string, Entry[]> = {
  '/repo': [
    { name: 'skills', kind: 'dir' },
    { name: 'README.md', kind: 'file' },
    { name: '.git', kind: 'dir' },
  ],
  '/repo/skills': [{ name: 'a', kind: 'dir' }],
  '/repo/skills/a': [{ name: 'SKILL.md', kind: 'file' }],
}

/** The repo with a node_modules of two packages, to see what starts folded. */
const WITH_MODULES: Record<string, Entry[]> = {
  ...FILES,
  '/repo': [...(FILES['/repo'] ?? []), { name: 'node_modules', kind: 'dir' }],
  '/repo/node_modules': [
    { name: 'left-pad', kind: 'dir' },
    { name: 'is-odd', kind: 'dir' },
  ],
  '/repo/node_modules/left-pad': [{ name: 'index.js', kind: 'file' }],
  '/repo/node_modules/is-odd': [{ name: 'index.js', kind: 'file' }],
}

const STATUS = ['# branch.oid 1234567', '# branch.head main', '1 .M N... 100644 100644 100644 a b README.md', ''].join('\0')
const NUMSTAT = '3\t1\tREADME.md\0'
const DIFF = ['diff --git a/README.md b/README.md', '--- a/README.md', '+++ b/README.md', '@@ -1 +1 @@', '-old line', '+new line', ''].join('\n')

const PANE_PROPS = {
  title: 'tree',
  isFocused: false,
  bodyColumns: 32,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
}

type Write = { key: string; value: unknown }

/** What a test reads back from beneath the plugin, and what it hands it: the text any file reads as. */
type Spy = { text?: string; argv?: string[][]; opens?: { columns?: number }[]; files?: Record<string, Entry[]> }

/** The world beneath the plugin: a clock and store in memory, a fake repo on disk, git answered from fixtures. */
const world = (on: On, filled: string[], writes: Write[], stored: Record<string, unknown>, spy: Spy = {}) => {
  on('state.set', { plugin: 'tree' }, ($, e, next) => {
    writes.push({ key: e.key, value: e.value })
    return next(e)
  })
  // the store, answered from `stored` so the test can read it back
  on('store.get', ($, e) => ({ value: stored[e.key] }))
  on('store.set', ($, e) => {
    stored[e.key] = e.value
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    delete stored[e.key]
    return { value: undefined }
  })
  on('store.keys', () => ({ value: Object.keys(stored) }))
  const clock = mock.clock(on)
  on('config.list', () => ({ value: [] }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('session.root', () => ({ value: ROOT }))
  on('session.id', () => ({ value: 'session-1' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.open', ($, e) => {
    spy.opens?.push({ columns: e.columns })
    return { value: { isPlaced: true as const } }
  })
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [{ id: 'tree', title: 'tree', isShown: true, isFocused: false, isPlaced: true }] }))
  on('ui.scroll', () => ({}))
  // the band as the engine leaves it with no survey up: empty
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('ui.focus', () => ({}))
  on('ui.toast', () => ({ value: undefined }))
  on('env.get', () => ({ value: undefined }))
  // the engine hands the op an absolute path in the host's spelling (C:\repo on Windows); key the fixture by the POSIX form
  const posix = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')
  on('fs.list', ($, e) => ({ value: ((spy.files ?? FILES)[posix(e.path)] ?? []).map(x => ({ ...x, size: 0, mtimeMs: 0, isLink: false })) }))
  on('fs.stat', () => ({ value: { kind: 'dir' as const, size: 0, mtimeMs: 1, isLink: false } }))
  on('fs.read', () => ({ value: spy.text ?? 'one\ntwo\n' }))
  on('process.run', ($, e) => {
    spy.argv?.push([...e.argv])
    const sub = e.argv[1]
    const isNumstat = e.argv.includes('--numstat')
    const stdout = sub === 'rev-parse' ? '\n' : sub === 'status' ? STATUS : sub === 'diff' ? (isNumstat ? NUMSTAT : DIFF) : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('prompt.fill', ($, e) => {
    filled.push(e.text)
    return { isFilled: true }
  })
  return clock
}

const start = async ($: Engine) => {
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  const ran = await $.command.run({ command: 'tree', args: 'refresh', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(ran.text).toBe('tree: refreshed.')
}

const mountTree = ($: Engine, props = PANE_PROPS) => $.ui.mount({ plugin: 'tree', surface: 'terminal', component: 'Pane', requestId: 'tree', props })

/** The band above the prompt, 12 rows and 120 columns: its border, a header row, 8 lines of the file, a cue row. */
const BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 120, scroll: { offset: 0, bodyRows: 11 }, view: {} }

const mountBand = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'tree', surface, component: 'AbovePrompt', requestId: 'band', props: BAND_PROPS })

/** Every folder open, as the tree drew before `startFolded`: what the tests of the open tree describe. */
const OPEN = { options: { startFolded: false } }

const lastWrite = (writes: Write[], key: string): unknown => writes.filter(w => w.key === key).at(-1)?.value

test('draws the whole working directory expanded with git badges, and a click previews the file', OPEN, async ($, on) => {
  world(on, [], [], {})
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'tree', surface, component: 'Pane', requestId: 'tree', props: PANE_PROPS })
    expect(await ui.find({ key: 'd:skills/a' }), `${surface}: compact chain skills/a`).toBeDefined()
    expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), `${surface}: nested file`).toBeDefined()
    expect(await ui.find({ key: 'f:README.md' }), `${surface}: root file`).toBeDefined()
    expect(await ui.find({ key: 'd:.git' }), `${surface}: .git hidden`).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: 'repo' }))?.props['bold'], `${surface}: working directory title, bold, on top`).toBe(true)
    expect(await ui.find({ type: 'Text', text: '⎇ main' }), `${surface}: branch header`).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '·1' }), `${surface}: dirty count`).toBeDefined()
    expect((await ui.find({ type: 'Text', text: 'M' }))?.props['color'], `${surface}: modified badge color`).toBe('warning')
    await ui.press({ key: 'f:README.md' })
    const band = await mountBand($, surface)
    const code = await band.find({ type: 'Code' })
    expect(code?.props['source'], `${surface}: a click previews the file above the prompt`).toBe('one\ntwo')
    expect(code?.props['path']).toBe('README.md')
    expect(await ui.find({ key: 'f:README.md' }), `${surface}: the tree stays in the pane`).toBeDefined()
    await ui.press({ key: 'act:close' })
    expect(await band.find({ type: 'Code' }), `${surface}: q takes the preview away`).toBeUndefined()
    await band.unmount()
    expect(await ui.find({ key: 'f:README.md' }), `${surface}: q goes back to the tree`).toBeDefined()
    await ui.unmount()
  }
})

test('clicking a folder ripples its rows out, then folds it, and the fold is remembered in the store', OPEN, async ($, on) => {
  const writes: Write[] = []
  const stored: Record<string, unknown> = {}
  const clock = world(on, [], writes, stored)
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'd:skills/a' })
  expect((lastWrite(writes, 'anim') as { kind: string } | null)?.kind, 'the ripple starts').toBe('fold')
  expect(lastWrite(writes, 'collapsed'), 'not folded yet').toEqual([])
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'the row is still there while it leaves').toBeDefined()
  expect((await ui.find({ type: 'Text', text: 'SKILL' }))?.props['dimColor'], 'dim on its way out').toBe(true)
  await clock.advance(100)
  expect(lastWrite(writes, 'collapsed'), 'folded once the ripple lands').toEqual(['skills/a'])
  expect(lastWrite(writes, 'anim')).toBe(null)
  expect(stored[`collapsed:${ROOT}`]).toEqual(['skills/a'])
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeUndefined()
  await ui.press({ key: 'd:skills/a' })
  expect((lastWrite(writes, 'anim') as { kind: string } | null)?.kind, 'unfolding ripples too').toBe('unfold')
  expect(lastWrite(writes, 'collapsed'), 'unfolded at once').toEqual([])
  expect((await ui.find({ type: 'Text', text: 'SKILL' }))?.props['dimColor'], 'arrives dim').toBe(true)
  await clock.advance(200)
  expect(lastWrite(writes, 'anim')).toBe(null)
  expect((await ui.find({ type: 'Text', text: 'SKILL' }))?.props['dimColor'], 'then at full strength').toBe(false)
  await ui.unmount()
})

test('an Edit marks the file active while it runs, leaves it in the trail, and /clear forgets it', async ($, on) => {
  const writes: Write[] = []
  world(on, [], writes, {})
  let activeDuringCall: unknown
  on('tool.call', { tool: 'Edit' }, () => {
    activeDuringCall = lastWrite(writes, 'active')
    return { deny: 'not run in a test' }
  })
  await start($)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/README.md', old_string: 'a', new_string: 'b' })
  expect(activeDuringCall).toEqual([expect.objectContaining({ path: 'README.md', isRead: false, tool: 'Edit' })])
  expect(lastWrite(writes, 'active')).toEqual([])
  expect(Object.keys(lastWrite(writes, 'trail') as Record<string, number>)).toEqual(['README.md'])

  await $.session.end({ reason: 'clear', sessionId: 'session-1', resume: { id: 'session-1' } })
  expect(lastWrite(writes, 'trail')).toEqual({})
})

test('the legend is always drawn and sits under the rows, dim until the pane has focus', async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  const buttons = await ui.findAll({ type: 'Button' })
  expect(buttons.map(b => b.key).slice(-11)).toEqual([
    'act:changes',
    'act:filter',
    'act:focus',
    'act:ignored',
    'act:refresh',
    'act:collapse',
    'act:expand',
    'act:mention',
    'act:open',
    'act:down',
    'act:up',
  ])
  expect((await ui.find({ key: 'act:down' }))?.props['hotkey']).toBe('j')
  expect((await ui.find({ key: 'act:up' }))?.props['hotkey']).toBe('k')
  expect((await ui.find({ key: 'act:refresh' }))?.props['dimColor']).toBe(true)
  expect((await ui.find({ key: 'act:refresh' }))?.props['hotkey']).toBe('r')
  await ui.unmount()
  const focused = await mountTree($, { ...PANE_PROPS, isFocused: true })
  expect((await focused.find({ key: 'act:refresh' }))?.props['dimColor']).toBe(false)
  await focused.unmount()
})

test('docked, the pane scrolls its own window with edge cues: rows move, the header and legend stay', OPEN, async ($, on) => {
  // the cues sit in the blank rows under the header and above the legend
  world(on, [], [], {})
  await start($)
  // body of 10 rows at 32 columns (30 after side padding): title 1, branch 1, blank 1, 2 rows of tree, blank 1,
  // legend 4 ("g: changes  f: find  z: focus" / "h: ignored  r: refresh" / "c: fold  e: unfold  m: mention" / "o: editor  j: ↓  k: ↑")
  const props = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 10 } }
  const ui = await mountTree($, props)
  expect(await ui.find({ key: 'd:skills/a' })).toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'third row is below the window').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '↓ 1 more' }), 'bottom edge cue').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↑' }), 'no top cue at the top').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '┃' }), 'scrollbar thumb').toBeDefined()
  expect(await ui.find({ key: 'act:expand' }), 'legend drawn even though rows overflow').toBeDefined()
  // the wheel, over the body: it scrolls (keys, with no pointer, move the cursor instead)
  const scroll = (by: number) =>
    $.ui.scroll({ component: 'Pane', requestId: 'tree', offset: 0, by, bodyRows: 10, contentRows: 11, origin: { kind: 'person' }, pointer: { column: 4, row: 0 } })
  await scroll(1)
  expect(await ui.find({ key: 'd:skills/a' }), 'first row scrolled out').toBeUndefined()
  expect(await ui.find({ key: 'f:README.md' }), 'third row scrolled in').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↑ 1 more' }), 'top edge cue').toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'repo' }), 'title stays').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '⎇ main' }), 'branch row stays').toBeDefined()
  await scroll(-20)
  expect(await ui.find({ key: 'd:skills/a' }), 'a big move jumps back to the top').toBeDefined()
  await ui.unmount()
})

test('the Changes view groups changed files with line counts, a press previews one, and ± peeks the diff', OPEN, async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'act:changes' })
  expect(await ui.find({ type: 'Text', text: 'Modified' }), 'group heading').toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'changed file row').toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'unchanged file absent').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '+3 −1' }), 'line counts').toBeDefined()
  expect((await ui.find({ key: 'act:changes' }))?.text, 'legend offers the way back').toBe('tree')
  await ui.press({ key: 'f:README.md' })
  const band = await mountBand($)
  expect((await band.find({ type: 'Code' }))?.props['path'], 'the row previews the file').toBe('README.md')
  await band.unmount()
  expect(await ui.find({ type: 'Text', text: 'Modified' }), 'the changes stay in the pane while it shows').toBeDefined()
  await ui.press({ key: 'act:close' })
  expect(await ui.find({ type: 'Text', text: 'Modified' }), 'q goes back to the changes').toBeDefined()
  await ui.press({ key: 'pk:README.md' })
  expect((await ui.find({ type: 'Text', text: '+new line' }))?.props['color'], 'added line colored').toBe('diffAdded')
  expect((await ui.find({ type: 'Text', text: '-old line' }))?.props['color'], 'removed line colored').toBe('diffRemoved')
  expect((await ui.find({ key: 'act:changes' }))?.text).toBe('back')
  await ui.press({ key: 'act:changes' })
  expect(await ui.find({ type: 'Text', text: 'Modified' }), 'back to the changes').toBeDefined()
  await ui.press({ key: 'act:changes' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'back to the tree').toBeDefined()
  await ui.unmount()
})

test('the filter narrows the tree with fuzzy matching, highlights the hits, and Enter previews the best one', async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'act:filter' })
  expect(await ui.find({ type: 'Input', key: 'filter' }), 'filter row opened').toBeDefined()
  await ui.input({ key: 'filter', text: 'skl', kind: 'change' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'fuzzy hit').toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'non-match dropped').toBeUndefined()
  expect((await ui.find({ type: 'Text', text: 'SK' }))?.props['color'], 'hit highlighted, in the file name rather than the folder').toBe('claude')
  await ui.input({ key: 'filter', text: 'skl' })
  const band = await mountBand($)
  expect((await band.find({ type: 'Code' }))?.props['path'], 'Enter previews the best match').toBe('skills/a/SKILL.md')
  await band.unmount()
  await ui.press({ key: 'act:close' })
  expect(await ui.find({ type: 'Input', key: 'filter' }), 'q goes back to the filter as it was').toBeDefined()
  await ui.press({ key: 'act:clear' })
  expect(await ui.find({ type: 'Input', key: 'filter' }), 'cleared').toBeUndefined()
  expect(await ui.find({ key: 'f:README.md' }), 'tree is back').toBeDefined()
  await ui.unmount()
})

test('focus mode prunes the tree to the files in play', OPEN, async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'act:focus' })
  expect(await ui.find({ key: 'f:README.md' }), 'modified file kept').toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'untouched file pruned').toBeUndefined()
  expect(await ui.find({ key: 'd:skills/a' }), 'folder with nothing in play pruned').toBeUndefined()
  expect((await ui.find({ key: 'act:focus' }))?.text).toBe('all')
  await ui.press({ key: 'act:focus' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'whole tree back').toBeDefined()
  await ui.unmount()
})

test('visual polish: indent guides, dim extensions, bold folders, the cursor mark on the focused row', OPEN, async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ type: 'Text', text: '│ ' }), 'a guide in the nested file row').toBeDefined()
  expect((await ui.find({ type: 'Text', text: '.md' }))?.props['dimColor'], 'extension drawn dim').toBe(true)
  expect((await ui.find({ type: 'Text', text: 'SKILL' }))?.props['dimColor'], 'stem at full strength').toBe(false)
  expect((await ui.find({ type: 'Text', text: 'skills/a' }))?.props['bold'], 'folder name bold').toBe(true)
  expect(await ui.find({ type: 'Text', text: '▍' }), 'no cursor mark without focus').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '▏' }), 'no focus edge without focus').toBeUndefined()
  expect((await ui.find({ type: 'Text', text: 'ctrl+x tab' }))?.props['dimColor'], 'the chord hint, dim, while unfocused').toBe(true)
  await ui.unmount()
  await $.ui.focus({ component: 'Pane', requestId: 'tree', plugin: 'tree', element: 'f:README.md', origin: { kind: 'person' } })
  const focused = await mountTree($, { ...PANE_PROPS, isFocused: true })
  expect(await focused.find({ type: 'Text', text: '▍' }), 'cursor mark once a row holds the ring').toBeDefined()
  expect(await focused.find({ type: 'Text', text: '▏' }), 'accent edge down the pane while focused').toBeDefined()
  expect(await focused.find({ type: 'Text', text: 'esc' }), 'how to leave, while focused').toBeDefined()
  expect(await focused.find({ type: 'Text', text: 'ctrl+x tab' }), 'chord hint gone while focused').toBeUndefined()
  await focused.unmount()
})

test('the glass: every row sits on a hex slab, warm at the top and cool at the bottom, with the badge as a chip', async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ui = await mountTree($)
  const rows = (await ui.findAll({ type: 'Box' })).map(b => b.props['backgroundColor']).filter((c): c is string => typeof c === 'string')
  expect(rows.length > 30, 'the slab reaches every row of the body').toBe(true)
  expect(rows.every(c => /^#[0-9a-f]{6}$/.test(c))).toBe(true)
  const red = (hex: string) => parseInt(hex.slice(1, 3), 16)
  const blue = (hex: string) => parseInt(hex.slice(5, 7), 16)
  const near = rows[1] as string // the first row under the title, which fades into the terminal at its top edge
  expect(rows.some(c => red(c) < red(near) && blue(c) > blue(near)), 'warm at the top, cool further down').toBe(true)
  const chip = await ui.find({ type: 'Text', text: ' M ' })
  expect(typeof chip?.props['backgroundColor'], 'the badge sits on a tinted chip').toBe('string')
  expect(await ui.find({ type: 'Text', text: '▐' }), 'the status pill has its caps').toBeDefined()
  expect((await ui.findAll({ type: 'Text', text: '─' })).length > 0, 'hairlines in the cue rows').toBe(true)
  const title = await ui.find({ type: 'Text', text: 'repo' })
  expect(title?.props['bold'], 'the title stays bold over its gradient').toBe(true)
  await ui.unmount()
})

test('the now-editing line lingers as "last:" after an Edit and jumps to the file when pressed', async ($, on) => {
  const writes: Write[] = []
  world(on, [], writes, {})
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'not run in a test' }))
  await start($)
  const before = await mountTree($)
  expect(await before.find({ key: 'act:now' }), 'nothing to show while idle').toBeUndefined()
  await before.unmount()
  await $.tool.call({ tool: 'Edit', file_path: '/repo/skills/a/SKILL.md', old_string: 'a', new_string: 'b' })
  const ui = await mountTree($)
  expect((await ui.find({ key: 'act:now' }))?.text, 'the file just closed').toContain('last: skills/a/SKILL.md')
  await ui.press({ key: 'act:changes' })
  expect(await ui.find({ type: 'Text', text: 'Modified' })).toBeDefined()
  await ui.press({ key: 'act:now' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'pressing it returns to the tree at the file').toBeDefined()
  expect(lastWrite(writes, 'view')).toBe('tree')
  await ui.unmount()
})

test('a file outside the project is still shown, under its own heading', async ($, on) => {
  world(on, [], [], {})
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'not run in a test' }))
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/elsewhere/notes.md' })
  const ui = await mountTree($)
  expect(await ui.find({ type: 'Text', text: 'outside project' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '/elsewhere/notes.md' })).toBeDefined()
  await ui.unmount()
})

/** A scroll key as the engine sends it to a focused pane: the person's, with no pointer cell. */
const pressKey = ($: Engine, by: number, bodyRows: number) =>
  $.ui.scroll({ component: 'Pane', requestId: 'tree', offset: 0, by, bodyRows, contentRows: bodyRows + 1, origin: { kind: 'person' } })

test('arrow keys and j/k move the row cursor, the window follows it, and the wheel only scrolls', OPEN, async ($, on) => {
  const writes: Write[] = []
  world(on, [], writes, {})
  await start($)
  // body of 10 rows: two lines of tree in the window (see the scroll test above)
  const props = { ...PANE_PROPS, isFocused: true, scroll: { offset: 0, bodyRows: 10 } }
  const ui = await mountTree($, props)
  await pressKey($, 1, 10)
  expect(lastWrite(writes, 'focused'), 'the first key lands on the first row in view').toBe('d:skills/a')
  await pressKey($, 1, 10)
  expect(lastWrite(writes, 'focused')).toBe('f:skills/a/SKILL.md')
  expect(await ui.find({ type: 'Text', text: '▍' }), 'the cursor mark').toBeDefined()
  await pressKey($, 1, 10)
  expect(lastWrite(writes, 'focused')).toBe('f:README.md')
  expect(await ui.find({ key: 'f:README.md' }), 'the window followed the cursor down').toBeDefined()
  expect(await ui.find({ key: 'd:skills/a' }), 'and the top row left it').toBeUndefined()
  await pressKey($, 1, 10)
  expect(lastWrite(writes, 'focused'), 'the cursor stops at the last row').toBe('f:README.md')
  await ui.press({ key: 'act:up' })
  expect(lastWrite(writes, 'focused'), 'k goes up').toBe('f:skills/a/SKILL.md')
  await ui.press({ key: 'act:up' })
  expect(lastWrite(writes, 'focused')).toBe('d:skills/a')
  expect(await ui.find({ key: 'd:skills/a' }), 'the window followed it back up').toBeDefined()
  await ui.press({ key: 'act:down' })
  expect(lastWrite(writes, 'focused'), 'j goes down').toBe('f:skills/a/SKILL.md')
  await $.ui.scroll({ component: 'Pane', requestId: 'tree', offset: 0, by: 1, bodyRows: 10, contentRows: 11, origin: { kind: 'person' }, pointer: { column: 4, row: 0 } })
  expect(lastWrite(writes, 'focused'), 'the wheel leaves the cursor').toBe('f:skills/a/SKILL.md')
  expect(lastWrite(writes, 'offset'), 'and scrolls the window').toBe(1)
  await pressKey($, -20, 10)
  expect(lastWrite(writes, 'focused'), 'Home goes to the first row').toBe('d:skills/a')
  await pressKey($, 20, 10)
  expect(lastWrite(writes, 'focused'), 'End to the last').toBe('f:README.md')
  await ui.unmount()
})

const FIFTY = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join('\n') + '\n'

test('the preview above the prompt is as wide as the transcript and scrolls from the tree pane, which keeps its rows', async ($, on) => {
  const writes: Write[] = []
  world(on, [], writes, {}, { text: FIFTY })
  await start($)
  const ui = await mountTree($, { ...PANE_PROPS, isFocused: true, scroll: { offset: 0, bodyRows: 20 } })
  await $.ui.focus({ component: 'Pane', requestId: 'tree', plugin: 'tree', element: 'f:README.md', origin: { kind: 'person' } })
  await ui.press({ key: 'f:README.md' })
  const band = await mountBand($)
  const code = await band.find({ type: 'Code' })
  expect(String(code?.props['source']).split('\n').length, 'the band height less its border, header and cue').toBe(8)
  expect(code?.props['startLine']).toBe(1)
  expect(await band.find({ type: 'Text', text: '1–8/50' }), 'where the window is').toBeDefined()
  expect(await band.find({ type: 'Text', text: '↓ 42 more' })).toBeDefined()
  const frame = (await band.findAll({ type: 'Box' })).find(b => b.props['borderStyle'] === 'round')
  expect(frame?.props['borderColor'], 'framed in the accent').toBe('#d97757')
  expect(await ui.find({ key: 'f:README.md' }), 'the pane keeps the tree').toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'below ↙' }), 'and points at the band').toBeDefined()
  await pressKey($, 20, 20)
  expect((await band.find({ type: 'Code' }))?.props['startLine'], 'PgDn in the pane pages the band').toBe(8)
  await ui.press({ key: 'act:down' })
  expect((await band.find({ type: 'Code' }))?.props['startLine'], 'j a line').toBe(9)
  await $.ui.scroll({ component: 'AbovePrompt', requestId: 'band', offset: 0, by: 3, bodyRows: 11, contentRows: 12, origin: { kind: 'person' }, pointer: { column: 10, row: 3 } })
  expect((await band.find({ type: 'Code' }))?.props['startLine'], 'the wheel over the band scrolls it').toBe(12)
  await $.ui.scroll({ component: 'Pane', requestId: 'tree', offset: 0, by: 1, bodyRows: 20, contentRows: 21, origin: { kind: 'person' }, pointer: { column: 4, row: 0 } })
  expect((await band.find({ type: 'Code' }))?.props['startLine'], 'the wheel over the pane leaves the file').toBe(12)
  await ui.press({ key: 'act:close' })
  expect(await band.find({ type: 'Code' }), 'q takes it away').toBeUndefined()
  expect(lastWrite(writes, 'focused'), 'the cursor is back on the row it left').toBe('f:README.md')
  await band.unmount()
  await ui.unmount()
})

test('Enter on a folder folds it; on a file, with the preview in the pane, it shows the file there, pages it, and q goes back to the same row', { options: { previewIn: 'pane', startFolded: false } }, async ($, on) => {
  const writes: Write[] = []
  const spy: Spy = { text: FIFTY }
  world(on, [], writes, {}, spy)
  await start($)
  // body of 20 rows in the preview: title 1, file row 1, blank 1, 14 lines, blank 1, legend 2 ("q: back  m: mention  o: editor" / "j: ↓  k: ↑")
  const props = { ...PANE_PROPS, isFocused: true, scroll: { offset: 0, bodyRows: 20 } }
  const ui = await mountTree($, props)
  await pressKey($, 1, 20)
  await ui.press({ key: 'd:skills/a' }) // Enter presses the row the cursor is on
  expect((lastWrite(writes, 'anim') as { kind: string } | null)?.kind, 'Enter on a folder folds it').toBe('fold')
  await $.ui.focus({ component: 'Pane', requestId: 'tree', plugin: 'tree', element: 'f:README.md', origin: { kind: 'person' } })
  await ui.press({ key: 'f:README.md' })
  const code = await ui.find({ type: 'Code' })
  expect(code?.props['startLine'], 'numbered from the top').toBe(1)
  expect(String(code?.props['source']).split('\n').length, 'only the window is drawn').toBe(14)
  expect(code?.props['wrap'], 'a line is a row').toBe('truncate-end')
  expect(await ui.find({ type: 'Text', text: '1–14/50' }), 'where the window is').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↓ 36 more' }), 'the lines below').toBeDefined()
  await pressKey($, 20, 20)
  expect((await ui.find({ type: 'Code' }))?.props['startLine'], 'PgDn pages').toBe(14)
  await ui.press({ key: 'act:down' })
  expect((await ui.find({ type: 'Code' }))?.props['startLine'], 'j a line').toBe(15)
  await pressKey($, 100, 20)
  expect(await ui.find({ type: 'Text', text: '37–50/50' }), 'End shows the last lines').toBeDefined()
  await ui.press({ key: 'act:close' })
  expect(await ui.find({ type: 'Code' }), 'the preview is gone').toBeUndefined()
  expect(lastWrite(writes, 'focused'), 'the cursor is back on the row it left').toBe('f:README.md')
  await ui.unmount()
})

test('a binary file shows a note; m mentions it and o opens it in the editor', async ($, on) => {
  const filled: string[] = []
  const spy: Spy = { text: 'PNG\0data', argv: [] }
  world(on, filled, [], {}, spy)
  await start($)
  const ui = await mountTree($, { ...PANE_PROPS, isFocused: true })
  await ui.press({ key: 'f:README.md' })
  const band = await mountBand($)
  expect(await band.find({ type: 'Text', text: /^binary file/ }), 'a note instead of the text').toBeDefined()
  expect(await band.find({ type: 'Code' })).toBeUndefined()
  await band.unmount()
  await ui.press({ key: 'act:mention' })
  expect(filled.at(-1), 'm mentions the previewed file').toBe('@README.md ')
  await ui.press({ key: 'act:open' })
  expect(spy.argv?.at(-1), 'o runs the editor at the top line').toEqual(['code', '-g', '/repo/README.md:1'])
  await ui.press({ key: 'act:close' })
  await $.ui.focus({ component: 'Pane', requestId: 'tree', plugin: 'tree', element: 'd:skills/a', origin: { kind: 'person' } })
  await ui.press({ key: 'act:mention' })
  expect(filled.at(-1), 'm on a folder mentions the folder').toBe('@skills/a/ ')
  await ui.unmount()
})

test('the editor command is configurable, with a quoted part kept whole', { options: { editor: 'subl "{path}:{line}" --wait' } }, async ($, on) => {
  const spy: Spy = { argv: [] }
  world(on, [], [], {}, spy)
  await start($)
  const ui = await mountTree($, { ...PANE_PROPS, isFocused: true })
  await $.ui.focus({ component: 'Pane', requestId: 'tree', plugin: 'tree', element: 'f:README.md', origin: { kind: 'person' } })
  await ui.press({ key: 'act:open' })
  expect(spy.argv?.at(-1)).toEqual(['subl', '/repo/README.md:1', '--wait'])
  await ui.unmount()
})

test('/tree preview <path> opens the preview from the prompt', async ($, on) => {
  world(on, [], [], {})
  await start($)
  const ran = await $.command.run({ command: 'tree', args: 'preview skills/a/SKILL.md', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect(ran.text).toBe('tree: previewing skills/a/SKILL.md.')
  const band = await mountBand($)
  expect((await band.find({ type: 'Code' }))?.props['path']).toBe('skills/a/SKILL.md')
  await band.unmount()
})

test('node_modules starts folded; a press opens it and the opening is remembered, another folds it, and e puts it back', OPEN, async ($, on) => {
  const writes: Write[] = []
  const stored: Record<string, unknown> = {}
  const clock = world(on, [], writes, stored, { files: WITH_MODULES })
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'd:node_modules' }), 'the folder is listed').toBeDefined()
  expect(await ui.find({ key: 'd:node_modules/left-pad' }), 'its contents are not').toBeUndefined()
  expect(lastWrite(writes, 'dirs') as Record<string, unknown>, 'and not even walked').not.toHaveProperty('node_modules')

  await ui.press({ key: 'd:node_modules' })
  await clock.advance(200)
  expect(await ui.find({ key: 'd:node_modules/left-pad' }), 'opened').toBeDefined()
  expect(lastWrite(writes, 'expanded')).toEqual(['node_modules'])
  expect(stored[`expanded:${ROOT}`], 'remembered in the store').toEqual(['node_modules'])
  expect(lastWrite(writes, 'collapsed')).toEqual([])

  await ui.press({ key: 'd:node_modules' })
  await clock.advance(200)
  expect(await ui.find({ key: 'd:node_modules/left-pad' }), 'folded again').toBeUndefined()
  expect(lastWrite(writes, 'collapsed')).toEqual(['node_modules'])
  expect(lastWrite(writes, 'expanded')).toEqual([])

  await ui.press({ key: 'd:node_modules' })
  await clock.advance(200)
  await ui.press({ key: 'act:expand' })
  expect(lastWrite(writes, 'expanded'), 'unfold all leaves folders that start folded folded').toEqual([])
  expect(await ui.find({ key: 'd:node_modules/left-pad' })).toBeUndefined()
  await ui.unmount()
})

test('Claude working inside node_modules does not open it, but /tree reveal does', OPEN, async ($, on) => {
  const writes: Write[] = []
  const clock = world(on, [], writes, {}, { files: WITH_MODULES })
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'not run in a test' }))
  await start($)
  const ui = await mountTree($)
  await $.tool.call({ tool: 'Read', file_path: '/repo/node_modules/left-pad/index.js' })
  await clock.advance(200)
  expect(lastWrite(writes, 'expanded') ?? [], 'followClaude leaves it folded').toEqual([])
  expect(await ui.find({ key: 'f:node_modules/left-pad/index.js' })).toBeUndefined()

  await $.command.run({ command: 'tree', args: 'reveal node_modules/left-pad/index.js', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  await clock.advance(200)
  expect(lastWrite(writes, 'expanded'), 'an explicit reveal opens it').toEqual(['node_modules'])
  expect(await ui.find({ key: 'f:node_modules/left-pad/index.js' })).toBeDefined()
  await ui.unmount()
})

test('collapsedFolders is configurable: an empty list folds nothing', { options: { collapsedFolders: '', startFolded: false } }, async ($, on) => {
  world(on, [], [], {}, { files: WITH_MODULES })
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'd:node_modules/left-pad' }), 'open like any folder').toBeDefined()
  await ui.unmount()
})

test('hiddenFolders leaves a folder out of the tree altogether', { options: { hiddenFolders: 'skills, node_modules' } }, async ($, on) => {
  const spy: Spy = { files: WITH_MODULES, argv: [] }
  world(on, [], [], {}, spy)
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'f:README.md' })).toBeDefined()
  expect(await ui.find({ key: 'd:skills/a' }), 'no row for a hidden folder').toBeUndefined()
  expect(await ui.find({ key: 'd:node_modules' }), 'hidden beats folded by default').toBeUndefined()
  await ui.unmount()
})

test('folders start folded; a press opens one and the opening is remembered, c folds it back and e opens everything', async ($, on) => {
  const writes: Write[] = []
  const stored: Record<string, unknown> = {}
  const clock = world(on, [], writes, stored)
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'd:skills/a' }), 'the chain still compacts into one row').toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'its contents folded away').toBeUndefined()
  expect(await ui.find({ key: 'f:README.md' }), 'files at the root show').toBeDefined()
  await ui.press({ key: 'd:skills/a' })
  await clock.advance(200)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'one press opens the whole chain').toBeDefined()
  expect(lastWrite(writes, 'expanded')).toEqual(['skills/a'])
  expect(stored[`expanded:${ROOT}`], 'remembered in the store').toEqual(['skills/a'])
  await ui.press({ key: 'act:collapse' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'c folds it back').toBeUndefined()
  expect(await ui.find({ key: 'd:skills/a' }), 'the chain stays whole').toBeDefined()
  await ui.press({ key: 'act:expand' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'e opens everything').toBeDefined()
  await ui.unmount()
})

test('a folder opened in an earlier session opens again', async ($, on) => {
  world(on, [], [], { [`expanded:${ROOT}`]: ['skills/a'] })
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeDefined()
  await ui.unmount()
})

test('following Claude opens the folders above the file it edits', async ($, on) => {
  const clock = world(on, [], [], {})
  on('tool.call', { tool: 'Edit' }, () => ({ deny: 'not run in a test' }))
  await start($)
  const ui = await mountTree($)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeUndefined()
  await $.tool.call({ tool: 'Edit', file_path: '/repo/skills/a/SKILL.md', old_string: 'a', new_string: 'b' })
  await clock.advance(200)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeDefined()
  await ui.unmount()
})

test('focus mode shows the files in play though their folders start folded, and a press there folds', { options: { followClaude: false } }, async ($, on) => {
  const clock = world(on, [], [], {})
  on('tool.call', { tool: 'Read' }, () => ({ deny: 'not run in a test' }))
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/repo/skills/a/SKILL.md' })
  const ui = await mountTree($)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'folded in the whole tree').toBeUndefined()
  await ui.press({ key: 'act:focus' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'shown in focus mode').toBeDefined()
  await ui.press({ key: 'd:skills/a' })
  await clock.advance(200)
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'the press folds the folder it shows open').toBeUndefined()
  await ui.unmount()
})

test('with animate off a folder folds and opens at once and its row flashes; c and e never flash', { options: { animate: false, startFolded: false } }, async ($, on) => {
  const writes: Write[] = []
  const clock = world(on, [], writes, {})
  await start($)
  const ui = await mountTree($)
  const backgrounds = async () => (await ui.findAll({ type: 'Box' })).map(b => b.props['backgroundColor'])
  const animKind = () => (lastWrite(writes, 'anim') as { kind: string } | null)?.kind
  await ui.press({ key: 'd:skills/a' })
  expect(lastWrite(writes, 'collapsed'), 'folded at once').toEqual(['skills/a'])
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'no ripple: the rows go at once').toBeUndefined()
  expect(animKind(), 'the row flashes').toBe('flash')
  const lit = await backgrounds()
  await clock.advance(500)
  expect(lastWrite(writes, 'anim'), 'and the flash fades').toBe(null)
  expect(await backgrounds(), 'the light is gone').not.toEqual(lit)
  await ui.press({ key: 'd:skills/a' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'opened at once').toBeDefined()
  expect(animKind(), 'opening flashes too').toBe('flash')
  await clock.advance(500)
  const animWrites = writes.filter(w => w.key === 'anim').length
  await ui.press({ key: 'act:collapse' })
  await ui.press({ key: 'act:expand' })
  expect(writes.filter(w => w.key === 'anim').length, 'fold all and unfold all do not flash').toBe(animWrites)
  await ui.unmount()
})
