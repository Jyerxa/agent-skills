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

/** The world beneath the plugin: a clock and store in memory, a fake repo on disk, git answered from fixtures. */
const world = (on: On, filled: string[], writes: Write[], stored: Record<string, unknown>) => {
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
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [{ id: 'tree', title: 'tree', isShown: true, isFocused: false, isPlaced: true }] }))
  on('ui.scroll', () => ({}))
  on('ui.focus', () => ({}))
  on('ui.toast', () => ({ value: undefined }))
  on('env.get', () => ({ value: undefined }))
  // the engine hands the op an absolute path in the host's spelling (C:\repo on Windows); key the fixture by the POSIX form
  const posix = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')
  on('fs.list', ($, e) => ({ value: (FILES[posix(e.path)] ?? []).map(x => ({ ...x, size: 0, mtimeMs: 0, isLink: false })) }))
  on('fs.stat', () => ({ value: { kind: 'dir' as const, size: 0, mtimeMs: 1, isLink: false } }))
  on('fs.read', () => ({ value: 'one\ntwo\n' }))
  on('process.run', ($, e) => {
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

const lastWrite = (writes: Write[], key: string): unknown => writes.filter(w => w.key === key).at(-1)?.value

test('draws the whole working directory expanded with git badges, and a click mentions the file', async ($, on) => {
  const filled: string[] = []
  world(on, filled, [], {})
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
    expect(filled.at(-1), `${surface}: click inserts a mention`).toBe('@README.md ')
    await ui.unmount()
  }
})

test('clicking a folder ripples its rows out, then folds it, and the fold is remembered in the store', async ($, on) => {
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
  expect(activeDuringCall).toEqual([expect.objectContaining({ path: 'README.md', isRead: false, isOutside: false, tool: 'Edit' })])
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
  expect(buttons.map(b => b.key).slice(-7)).toEqual(['act:changes', 'act:filter', 'act:focus', 'act:ignored', 'act:refresh', 'act:collapse', 'act:expand'])
  expect((await ui.find({ key: 'act:refresh' }))?.props['dimColor']).toBe(true)
  expect((await ui.find({ key: 'act:refresh' }))?.props['hotkey']).toBe('r')
  await ui.unmount()
  const focused = await mountTree($, { ...PANE_PROPS, isFocused: true })
  expect((await focused.find({ key: 'act:refresh' }))?.props['dimColor']).toBe(false)
  await focused.unmount()
})

test('docked, the pane scrolls its own window with edge cues: rows move, the header and legend stay', async ($, on) => {
  // the cues sit in the blank rows under the header and above the legend
  world(on, [], [], {})
  await start($)
  // body of 9 rows at 32 columns (30 after side padding): title 1, branch 1, blank 1, 2 rows of tree, blank 1,
  // legend 3 ("g: changes  f: find  z: focus" / "h: ignored  r: refresh" / "c: fold  e: unfold")
  const props = { ...PANE_PROPS, scroll: { offset: 0, bodyRows: 9 } }
  const ui = await mountTree($, props)
  expect(await ui.find({ key: 'd:skills/a' })).toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' })).toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'third row is below the window').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '↓ 1 more' }), 'bottom edge cue').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↑' }), 'no top cue at the top').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '┃' }), 'scrollbar thumb').toBeDefined()
  expect(await ui.find({ key: 'act:expand' }), 'legend drawn even though rows overflow').toBeDefined()
  const scroll = (by: number) => $.ui.scroll({ component: 'Pane', requestId: 'tree', offset: 0, by, bodyRows: 9, contentRows: 10, origin: { kind: 'person' } })
  await scroll(1)
  expect(await ui.find({ key: 'd:skills/a' }), 'first row scrolled out').toBeUndefined()
  expect(await ui.find({ key: 'f:README.md' }), 'third row scrolled in').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↑ 1 more' }), 'top edge cue').toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'repo' }), 'title stays').toBeDefined()
  expect(await ui.find({ type: 'Text', text: '⎇ main' }), 'branch row stays').toBeDefined()
  await scroll(-10)
  expect(await ui.find({ key: 'd:skills/a' }), 'Home jumps back to the top').toBeDefined()
  await ui.unmount()
})

test('the Changes view groups changed files with line counts, and ± peeks the diff', async ($, on) => {
  const filled: string[] = []
  world(on, filled, [], {})
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'act:changes' })
  expect(await ui.find({ type: 'Text', text: 'Modified' }), 'group heading').toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'changed file row').toBeDefined()
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'unchanged file absent').toBeUndefined()
  expect(await ui.find({ type: 'Text', text: '+3 −1' }), 'line counts').toBeDefined()
  expect((await ui.find({ key: 'act:changes' }))?.text, 'legend offers the way back').toBe('tree')
  await ui.press({ key: 'f:README.md' })
  expect(filled.at(-1)).toBe('@README.md ')
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

test('the filter narrows the tree with fuzzy matching, highlights the hits, and Enter mentions the best one', async ($, on) => {
  const filled: string[] = []
  world(on, filled, [], {})
  await start($)
  const ui = await mountTree($)
  await ui.press({ key: 'act:filter' })
  expect(await ui.find({ type: 'Input', key: 'filter' }), 'filter row opened').toBeDefined()
  await ui.input({ key: 'filter', text: 'skl', kind: 'change' })
  expect(await ui.find({ key: 'f:skills/a/SKILL.md' }), 'fuzzy hit').toBeDefined()
  expect(await ui.find({ key: 'f:README.md' }), 'non-match dropped').toBeUndefined()
  expect((await ui.find({ type: 'Text', text: 'SK' }))?.props['color'], 'hit highlighted, in the file name rather than the folder').toBe('claude')
  await ui.input({ key: 'filter', text: 'skl' })
  expect(filled.at(-1), 'Enter mentions the best match').toBe('@skills/a/SKILL.md ')
  await ui.press({ key: 'act:clear' })
  expect(await ui.find({ type: 'Input', key: 'filter' }), 'cleared').toBeUndefined()
  expect(await ui.find({ key: 'f:README.md' }), 'tree is back').toBeDefined()
  await ui.unmount()
})

test('focus mode prunes the tree to the files in play', async ($, on) => {
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

test('visual polish: indent guides, dim extensions, bold folders, the cursor mark on the focused row', async ($, on) => {
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
