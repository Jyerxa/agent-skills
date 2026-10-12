import type { ModelCompleteInput, ModelCompleteResult, ModelForkResult, On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { deepPrompt, houseStyle, instructions, QUICK, wrapDraft, writeMessage } from './meta'

const HOME = '/home/me'
const ROOT = '/repo'
const KEYS_PATH = `${HOME}/.claude/keybindings.json`
const BOUND = JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'ctrl+x e': 'diff:back', 'ctrl+x d': 'diff:nextSource' } }] })

const DRAFT = 'the tree preview jumps back to the top every time i reopen a file. can we make it rember where i was'
const TIDY = 'The tree preview jumps back to the top every time I reopen a file. Make it remember where I was.'
const DEEP = '## Goal\nMake the tree preview remember its scroll position per file.\n\n## Success Criteria\n- Reopening a file shows where I left it.'

const USAGE = { input_tokens: 400, output_tokens: 40, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const answered = (text: string): ModelCompleteResult => ({ isAnswered: true, text: `<prompt>\n${text}\n</prompt>`, usage: USAGE })

type Planned = { header: string; question: string; options: string[] }

/** A deep plan: one `<question>` block per question. */
const planning = (...questions: Planned[]): ModelCompleteResult => ({
  isAnswered: true,
  text: questions
    .map(q => `<question header="${q.header}">\n${q.question}\n${q.options.map(o => `<option>${o}</option>`).join('\n')}\n</question>`)
    .join('\n'),
  usage: USAGE,
})

const SCOPE: Planned = { header: 'Scope', question: 'Remember positions across sessions, or only this one?', options: ['Only this session', 'Across sessions'] }
const Q_KEY: Planned = { header: 'q key', question: 'Should q also close the preview from the prompt?', options: ['Separate task', 'Yes, now', 'You decide'] }

/** The deep pass's two fork messages for a draft. */
const planFor = (draft: string, style = '') => deepPrompt('plan', style, wrapDraft(draft))
const writeFor = (draft: string, answers: { header: string; question: string; answer: string }[], style = '') =>
  deepPrompt('write', style, writeMessage(draft, answers))

/** A reply: at once, or after the mocked clock moves this far. */
type Reply<R> = { result: R; afterMs?: number }

/** What the question dialog showed. */
type Shown = { question: string; header: string; options: string[] }

/** The world beneath the plugin: the prompt box, files, the model, the question dialog, toasts. */
type World = {
  box: { text: string }
  files: Record<string, string>
  replies: Reply<ModelCompleteResult>[]
  forks: Reply<ModelForkResult>[]
  /** the person's picks in the question dialog, in order; null is Esc */
  picks: (Reply<string> | null)[]
  requests: ModelCompleteInput[]
  forkPrompts: string[]
  shown: Shown[]
  toasts: string[]
}

const newWorld = (files: Record<string, string> = { [KEYS_PATH]: BOUND }): World => ({
  box: { text: '' },
  files,
  replies: [],
  forks: [],
  picks: [],
  requests: [],
  forkPrompts: [],
  shown: [],
  toasts: [],
})

// the engine hands file ops an absolute path in the host's spelling (C:\home\me on Windows); key the fixture by the POSIX form
const posix = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')

const beneath = (on: On, w: World) => {
  mock.store(on)
  mock.env(on, { USERPROFILE: HOME })
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('session.root', () => ({ value: ROOT }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('fs.read', ($, e) => {
    const text = w.files[posix(e.path)]
    return text === undefined ? { deny: 'no such file' } : { value: text }
  })
  on('fs.write', ($, e) => {
    w.files[posix(e.path)] = e.text
    return { value: undefined }
  })
  on('prompt.read', () => ({ value: { text: w.box.text, cursor: w.box.text.length } }))
  on('prompt.fill', ($, e) => {
    w.box.text = e.text
    return { isFilled: true }
  })
  on('model.complete', async ($, e) => {
    w.requests.push(e)
    const reply = w.replies.shift()
    if (!reply) throw new Error('no completion scripted')
    if (reply.afterMs) await clock.sleep(reply.afterMs)
    return { value: reply.result }
  })
  on('model.fork', async ($, e) => {
    w.forkPrompts.push(e.prompt)
    const reply = w.forks.shift()
    if (!reply) throw new Error('no fork scripted')
    if (reply.afterMs) await clock.sleep(reply.afterMs)
    return { value: reply.result }
  })
  // the engine's question dialog, as `$.ui.ask` raises it
  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e) => {
    const { questions } = e as unknown as { questions: { question: string; header: string; options: { label: string }[] }[] }
    const asked = questions[0]
    if (!asked) throw new Error('no question')
    w.shown.push({ question: asked.question, header: asked.header, options: asked.options.map(o => o.label) })
    const pick = w.picks.shift()
    if (pick === undefined) throw new Error('no pick scripted')
    if (pick === null) return { deny: 'The user dismissed the question.' }
    if (pick.afterMs) await clock.sleep(pick.afterMs)
    return { result: { questions, answers: { [asked.question]: pick.result } } }
  })
  on('ui.toast', ($, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  // the engine's own hint line
  on('ui.render', { component: 'PromptHint' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.hint}</Text>
  })
  return clock
}

const HINT = { isDraft: true, isWorking: false, hint: '? for shortcuts' }

const start = async ($: Engine) => {
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
}

const mountHint = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'enrich', surface, component: 'PromptHint', requestId: 'hint', props: HINT })

type Hint = Awaited<ReturnType<typeof mountHint>>

/** All the hint line's text, in order. */
const hintText = async (ui: Hint) => (await ui.findAll({ type: 'Text' })).map(t => t.text).join('')

const label = async (ui: Hint, pass: 'quick' | 'deep') => (await ui.find({ key: `enrich-${pass}` }))?.text

const enrich = ($: Engine, args: string) =>
  $.command.run({ command: 'enrich', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })

test('both chords sit at the end of the hint line while a draft is typed, on terminal and desktop', async ($, on) => {
  const w = newWorld()
  beneath(on, w)
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountHint($, surface)
    expect(await label(ui, 'quick'), surface).toBe('⌃x e quick')
    expect(await label(ui, 'deep'), surface).toBe('⌃x d deep')
    expect((await ui.find({ key: 'enrich-quick' }))?.props['action'], surface).toBe('diff:back')
    expect((await ui.find({ key: 'enrich-deep' }))?.props['action'], surface).toBe('diff:nextSource')
    expect(await ui.find({ type: 'Text', text: '? for shortcuts' }), `${surface}: the engine's line stays`).toBeDefined()
    await ui.redraw({ ...HINT, isDraft: false })
    expect(await ui.find({ key: 'enrich-quick' }), `${surface}: nothing without a draft`).toBeUndefined()
    await ui.unmount()
  }
})

test('a quick pass shows its seconds, then replaces the draft; the chord again puts the original back', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY), afterMs: 4500 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.advance(3000)
  expect(await hintText(ui)).toContain('quick pass · 3s · ')
  expect(await label(ui, 'quick')).toBe('⌃x e cancel')
  expect(w.box.text, 'the draft stays while the pass runs').toBe(DRAFT)

  await clock.advance(2000)
  expect(w.box.text).toBe(TIDY)
  expect(await hintText(ui)).toContain(`quick · ${DRAFT.length} → ${TIDY.length} chars · `)
  expect(await label(ui, 'quick')).toBe('⌃x e undo')
  expect(await label(ui, 'deep')).toBe('⌃x d deep')

  const request = w.requests[0]
  expect(request?.model).toBe('sonnet')
  expect(request?.effort).toBe('low')
  expect(request?.systemBlocks).toEqual([{ text: QUICK, cache: true }])
  expect(request?.prompt).toBe(wrapDraft(DRAFT))

  await ui.press({ key: 'enrich-quick' })
  expect(w.box.text, 'undo').toBe(DRAFT)
  expect(await label(ui, 'quick')).toBe('⌃x e quick')
  expect(w.requests, 'undo makes no call').toHaveLength(1)
})

test('a clear draft: the deep pass forks the session, writes at once, and ⌃x d again puts the original back', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: answered(DEEP) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.forkPrompts).toEqual([planFor(DRAFT)])
  expect(w.requests, 'a fork, not a completion').toHaveLength(0)
  expect(w.shown, 'no questions').toHaveLength(0)
  expect(w.box.text).toBe(DEEP)
  expect(await hintText(ui)).toContain(`deep · ${DRAFT.length} → ${DEEP.length} chars · `)
  expect(await label(ui, 'deep')).toBe('⌃x d undo')
  expect(await label(ui, 'quick')).toBe('⌃x e quick')
  await ui.press({ key: 'enrich-deep' })
  expect(w.box.text).toBe(DRAFT)
})

test('the deep pass plans its questions in one step, asks them back to back, then writes with the answers', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: planning(SCOPE, Q_KEY) }, { result: answered(DEEP) })
  w.picks.push({ result: 'Only this session (Recommended)' }, { result: 'You decide' })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()

  expect(w.shown).toEqual([
    { question: SCOPE.question, header: 'Scope', options: ['Only this session (Recommended)', 'Across sessions', 'You decide'] },
    // the model's own "You decide" is not offered twice
    { question: Q_KEY.question, header: 'q key', options: ['Separate task (Recommended)', 'Yes, now', 'You decide'] },
  ])
  const answers = [
    { header: 'Scope', question: SCOPE.question, answer: 'Only this session' },
    { header: 'q key', question: Q_KEY.question, answer: 'You decide (left to Claude Code)' },
  ]
  expect(w.forkPrompts, 'two steps: plan, then write').toEqual([planFor(DRAFT), writeFor(DRAFT, answers)])
  expect(w.box.text).toBe(DEEP)
  expect(await hintText(ui)).toContain(`deep · 2 answers · ${DRAFT.length} → ${DEEP.length} chars · `)
})

test('the hint follows the deep pass: reading, each question of the plan, writing', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: planning(SCOPE, Q_KEY), afterMs: 2000 }, { result: answered(DEEP), afterMs: 2000 })
  w.picks.push({ result: 'Across sessions', afterMs: 1000 }, { result: 'Separate task (Recommended)', afterMs: 1000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.advance(1000)
  expect(await hintText(ui)).toContain('deep · reading · 1s · ')
  await clock.advance(1500)
  expect(await hintText(ui)).toContain('deep · question 1 of 2 · esc cancels')
  await clock.advance(1000)
  expect(await hintText(ui)).toContain('deep · question 2 of 2 · esc cancels')
  await clock.advance(1000)
  expect(await hintText(ui)).toContain('deep · writing · ')
  await clock.advance(2000)
  expect(w.box.text).toBe(DEEP)
})

test('Esc in a question cancels the deep pass and leaves the draft', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: planning(SCOPE, Q_KEY) })
  w.picks.push(null)
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.toasts.at(-1)).toContain('deep pass cancelled')
  expect(w.shown, 'no question after Esc').toHaveLength(1)
  expect(w.forkPrompts, 'no write step after Esc').toHaveLength(1)
  expect(w.box.text).toBe(DRAFT)
  expect(await label(ui, 'deep')).toBe('⌃x d deep')
})

test('the timeout counts model calls only, never the time spent answering', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: planning(SCOPE) }, { result: answered(DEEP), afterMs: 3000 })
  w.picks.push({ result: 'Across sessions', afterMs: 200_000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.advance(200_000)
  expect(await hintText(ui)).toContain('deep · writing · ')
  await clock.advance(3000)
  expect(w.toasts).toHaveLength(0)
  expect(w.box.text).toBe(DEEP)
})

test('a plan of more than four questions is asked only up to four', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  const five = [1, 2, 3, 4, 5].map(i => ({ header: `Q${i}`, question: `Question ${i}?`, options: ['A', 'B'] }))
  w.forks.push({ result: planning(...five) }, { result: answered(DEEP) })
  for (let i = 1; i <= 4; i++) w.picks.push({ result: 'A (Recommended)' })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.shown.map(s => s.question)).toEqual(['Question 1?', 'Question 2?', 'Question 3?', 'Question 4?'])
  expect(w.box.text).toBe(DEEP)
})

test('a write step that returns no prompt fails the pass, and nothing lands', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: planning(SCOPE) }, { result: planning(Q_KEY) })
  w.picks.push({ result: 'Across sessions' })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.toasts.at(-1)).toContain('failed (the written reply held no prompt)')
  expect(w.box.text).toBe(DRAFT)
})

test('with no conversation to fork, both steps of the deep pass run on the fallback model, which the hint names', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: { isAnswered: false, reason: 'nothing-to-fork' } })
  w.replies.push({ result: planning(SCOPE) }, { result: answered(DEEP) })
  w.picks.push({ result: 'Across sessions' })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.forkPrompts, 'one fork, then completions').toHaveLength(1)
  const [plan, write] = w.requests
  expect(plan?.model).toBe('opus')
  expect(plan?.effort).toBeUndefined()
  expect(plan?.systemBlocks).toEqual([{ text: instructions('plan'), cache: true }])
  expect(plan?.prompt).toBe(wrapDraft(DRAFT))
  expect(write?.systemBlocks).toEqual([{ text: instructions('write'), cache: true }])
  expect(write?.prompt).toBe(writeMessage(DRAFT, [{ header: 'Scope', question: SCOPE.question, answer: 'Across sessions' }]))
  expect(w.box.text).toBe(DEEP)
  expect(await hintText(ui)).toContain('deep · opus · 1 answer · ')
})

test('the other chord on an untouched result runs its pass on the original, not the result', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY) })
  w.forks.push({ result: answered(DEEP) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.box.text).toBe(TIDY)
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.forkPrompts).toEqual([planFor(DRAFT)])
  expect(w.box.text).toBe(DEEP)
  await ui.press({ key: 'enrich-deep' })
  expect(w.box.text, 'undo goes back to the original draft').toBe(DRAFT)
})

test('a deep pass with no reply by the timeout fails, and its late result is dropped', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: answered(DEEP), afterMs: 120_000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.advance(90_000)
  expect(w.toasts.at(-1)).toContain('no reply within 90s')
  expect(await label(ui, 'deep')).toBe('⌃x d deep')
  await clock.advance(30_000)
  expect(w.box.text).toBe(DRAFT)
})

test('either chord cancels a running pass, and its late result is dropped', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.forks.push({ result: answered(DEEP), afterMs: 5000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-deep' })
  await clock.advance(1000)
  expect(await label(ui, 'deep')).toBe('⌃x d cancel')
  // the quick chord's Button is still mounted, hidden, so ⌃x e cancels too
  await ui.press({ key: 'enrich-quick' })
  expect(w.toasts.at(-1)).toContain('deep pass cancelled')
  expect(await label(ui, 'quick')).toBe('⌃x e quick')
  await clock.advance(5000)
  expect(w.box.text).toBe(DRAFT)
})

test('house style: yours, then the project, which wins; off in the config, none', async ($, on) => {
  const w = newWorld({ [KEYS_PATH]: BOUND, [`${HOME}/.claude/enrich.md`]: 'Use checkboxes.', [`${ROOT}/.claude/enrich.md`]: 'Name the test to add.' })
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY) })
  w.forks.push({ result: answered(DEEP) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  const style = houseStyle('Use checkboxes.', 'Name the test to add.')
  expect(style).toContain("follow this project's")
  expect(w.requests[0]?.systemBlocks).toEqual([{ text: instructions('quick', style), cache: true }])
  await ui.press({ key: 'enrich-deep' })
  await clock.settle()
  expect(w.forkPrompts[0]).toBe(planFor(DRAFT, style))
})

test('house style can be turned off', { options: { houseStyle: false } }, async ($, on) => {
  const w = newWorld({ [KEYS_PATH]: BOUND, [`${HOME}/.claude/enrich.md`]: 'Use checkboxes.' })
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.requests[0]?.systemBlocks).toEqual([{ text: QUICK, cache: true }])
})

// a test cannot raise the person's own `prompt.edit`, so the edit is made in the box beneath
test('once the result is edited, the chord runs a pass on the edited text', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY) }, { result: answered(`${TIDY} Keep the tests green.`) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.box.text).toBe(TIDY)
  w.box.text = `${TIDY} dont break tests`
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.requests[1]?.prompt).toBe(wrapDraft(`${TIDY} dont break tests`))
  expect(w.box.text).toBe(`${TIDY} Keep the tests green.`)
})

test('a draft changed mid-pass is left alone; /enrich last and /enrich original bring either back', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY), afterMs: 2000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.advance(500)
  w.box.text = `${DRAFT}!`
  await clock.advance(2000)
  expect(w.box.text).toBe(`${DRAFT}!`)
  expect(w.toasts.at(-1)).toContain('not applied')
  expect((await enrich($, 'last')).text).toContain('the last result')
  expect(w.box.text).toBe(TIDY)
  expect((await enrich($, 'original')).text).toContain('original')
  expect(w.box.text).toBe(DRAFT)
})

test('a failed pass leaves the draft and says why', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: USAGE } })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.box.text).toBe(DRAFT)
  expect(w.toasts.at(-1)).toContain('overloaded 529')
  expect(await label(ui, 'quick')).toBe('⌃x e quick')
})

test('a dropped mention is named in the hint line', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = 'fix @src/a.ts so retry works'
  w.replies.push({ result: answered('Fix retry.') })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect((await ui.find({ type: 'Text', text: /dropped/ }))?.text).toBe('⚠ dropped @src/a.ts · ')
})

test('slash commands and bash lines are left alone', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  const ui = await mountHint($)
  for (const draft of ['/clear', '!ls']) {
    w.box.text = draft
    await ui.press({ key: 'enrich-deep' })
    await clock.settle()
    expect(w.box.text).toBe(draft)
  }
  expect(w.forkPrompts).toHaveLength(0)
  expect(w.toasts).toHaveLength(2)
})

test('with no chords bound the hint says so, and /enrich keys install binds both', async ($, on) => {
  const w = newWorld({})
  beneath(on, w)
  await start($)
  const ui = await mountHint($)
  expect(await label(ui, 'quick')).toBe('quick')
  expect(await label(ui, 'deep')).toBe('deep')
  expect(await ui.find({ type: 'Text', text: '⌃x e/d unbound · /enrich keys install' })).toBeDefined()
  expect((await enrich($, 'keys')).text).toContain('"ctrl+x e": "diff:back", "ctrl+x d": "diff:nextSource"')

  expect((await enrich($, 'keys install')).text).toContain('bound ctrl+x e → diff:back, ctrl+x d → diff:nextSource')
  expect(JSON.parse(w.files[KEYS_PATH] ?? '{}').bindings).toEqual([{ context: 'Chat', bindings: { 'ctrl+x e': 'diff:back', 'ctrl+x d': 'diff:nextSource' } }])
  expect(w.files[`${KEYS_PATH}.bak`], 'no backup of a file that did not exist').toBeUndefined()
  expect(await label(ui, 'quick')).toBe('⌃x e quick')
  expect(await label(ui, 'deep')).toBe('⌃x d deep')
  expect(await ui.find({ type: 'Text', text: /unbound/ })).toBeUndefined()
})

test('keys install backs up an existing file, keeps its bindings and adds only what is missing', async ($, on) => {
  const existing = JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'ctrl+g': 'chat:externalEditor', 'ctrl+x e': 'diff:back' } }] })
  const w = newWorld({ [KEYS_PATH]: existing })
  beneath(on, w)
  await start($)
  const ui = await mountHint($)
  expect(await ui.find({ type: 'Text', text: '⌃x d unbound · /enrich keys install' })).toBeDefined()
  const installed = (await enrich($, 'keys install')).text
  expect(installed).toContain('bound ctrl+x d → diff:nextSource')
  expect(installed).toContain('already bound: ctrl+x e → diff:back')
  expect(w.files[`${KEYS_PATH}.bak`]).toBe(existing)
  expect(JSON.parse(w.files[KEYS_PATH] ?? '{}').bindings[0].bindings).toEqual({
    'ctrl+g': 'chat:externalEditor',
    'ctrl+x e': 'diff:back',
    'ctrl+x d': 'diff:nextSource',
  })
})

test('the quick model and effort come from the config', { options: { quickModel: 'haiku', quickEffort: 'medium' } }, async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.settle()
  expect(w.requests[0]?.model).toBe('haiku')
  expect(w.requests[0]?.effort).toBe('medium')
})
