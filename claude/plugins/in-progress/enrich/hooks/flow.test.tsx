import type { ModelCompleteInput, ModelCompleteResult, On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { QUICK, wrapDraft } from './meta'

const HOME = '/home/me'
const KEYS_PATH = `${HOME}/.claude/keybindings.json`
const BOUND = JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'ctrl+x e': 'diff:back' } }] })

const DRAFT = 'the tree preview jumps back to the top every time i reopen a file. can we make it rember where i was'
const TIDY = 'The tree preview jumps back to the top every time I reopen a file. Make it remember where I was.'

const USAGE = { input_tokens: 400, output_tokens: 40, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const answered = (text: string): ModelCompleteResult => ({ isAnswered: true, text: `<prompt>\n${text}\n</prompt>`, usage: USAGE })

/** A reply: at once, or after the mocked clock moves this far. */
type Reply = { result: ModelCompleteResult; afterMs?: number }

/** The world beneath the plugin: the prompt box, the keybindings file, the model, toasts. */
type World = {
  box: { text: string }
  files: Record<string, string>
  replies: Reply[]
  requests: ModelCompleteInput[]
  toasts: string[]
}

const newWorld = (files: Record<string, string> = { [KEYS_PATH]: BOUND }): World => ({ box: { text: '' }, files, replies: [], requests: [], toasts: [] })

// the engine hands file ops an absolute path in the host's spelling (C:\home\me on Windows); key the fixture by the POSIX form
const posix = (p: string) => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')

const beneath = (on: On, w: World) => {
  mock.store(on)
  mock.env(on, { USERPROFILE: HOME })
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
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
    if (!reply) throw new Error('no reply scripted')
    if (reply.afterMs) await clock.sleep(reply.afterMs)
    return { value: reply.result }
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
  await $.session.start({ cwd: '/repo', surface: 'terminal', isInteractive: true })
}

const mountHint = ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') =>
  $.ui.mount({ plugin: 'enrich', surface, component: 'PromptHint', requestId: 'hint', props: HINT })

/** All the hint line's text, in order. */
const hintText = async (ui: Awaited<ReturnType<typeof mountHint>>) => (await ui.findAll({ type: 'Text' })).map(t => t.text).join('')

const chordLabel = async (ui: Awaited<ReturnType<typeof mountHint>>) => (await ui.find({ key: 'enrich-quick' }))?.text

const enrich = ($: Engine, args: string) =>
  $.command.run({ command: 'enrich', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })

test('the chord sits at the end of the hint line while a draft is typed, on terminal and desktop', async ($, on) => {
  const w = newWorld()
  beneath(on, w)
  await start($)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountHint($, surface)
    const button = await ui.find({ key: 'enrich-quick' })
    expect(button?.text, surface).toBe('⌃x e quick')
    expect(button?.props['action'], surface).toBe('diff:back')
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
  expect(await chordLabel(ui)).toBe('⌃x e cancel')
  expect(w.box.text, 'the draft stays while the pass runs').toBe(DRAFT)

  await clock.advance(2000)
  expect(w.box.text).toBe(TIDY)
  expect(await hintText(ui)).toContain(`quick · ${DRAFT.length} → ${TIDY.length} chars · `)
  expect(await chordLabel(ui)).toBe('⌃x e undo')

  const request = w.requests[0]
  expect(request?.model).toBe('sonnet')
  expect(request?.effort).toBe('low')
  expect(request?.systemBlocks).toEqual([{ text: QUICK, cache: true }])
  expect(request?.prompt).toBe(wrapDraft(DRAFT))

  await ui.press({ key: 'enrich-quick' })
  expect(w.box.text, 'undo').toBe(DRAFT)
  expect(await chordLabel(ui)).toBe('⌃x e quick')
  expect(w.requests, 'undo makes no call').toHaveLength(1)
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

test('the chord cancels a running pass, and its late result is dropped', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  await start($)
  w.box.text = DRAFT
  w.replies.push({ result: answered(TIDY), afterMs: 5000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich-quick' })
  await clock.advance(1000)
  await ui.press({ key: 'enrich-quick' })
  expect(w.toasts.at(-1)).toContain('cancelled')
  expect(await chordLabel(ui)).toBe('⌃x e quick')
  await clock.advance(5000)
  expect(w.box.text).toBe(DRAFT)
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
  expect(await chordLabel(ui)).toBe('⌃x e quick')
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
    await ui.press({ key: 'enrich-quick' })
    await clock.settle()
    expect(w.box.text).toBe(draft)
  }
  expect(w.requests).toHaveLength(0)
  expect(w.toasts).toHaveLength(2)
})

test('with no chord bound the hint says so, and /enrich keys install binds it', async ($, on) => {
  const w = newWorld({})
  beneath(on, w)
  await start($)
  const ui = await mountHint($)
  expect(await chordLabel(ui)).toBe('quick')
  expect(await ui.find({ type: 'Text', text: /unbound: \/enrich keys install/ })).toBeDefined()
  expect((await enrich($, 'keys')).text).toContain('"ctrl+x e": "diff:back"')

  expect((await enrich($, 'keys install')).text).toContain('bound ctrl+x e → diff:back')
  expect(JSON.parse(w.files[KEYS_PATH] ?? '{}').bindings).toEqual([{ context: 'Chat', bindings: { 'ctrl+x e': 'diff:back' } }])
  expect(w.files[`${KEYS_PATH}.bak`], 'no backup of a file that did not exist').toBeUndefined()
  expect(await chordLabel(ui)).toBe('⌃x e quick')
})

test('keys install backs up an existing file and keeps its bindings', async ($, on) => {
  const existing = JSON.stringify({ bindings: [{ context: 'Chat', bindings: { 'ctrl+g': 'chat:externalEditor' } }] })
  const w = newWorld({ [KEYS_PATH]: existing })
  beneath(on, w)
  await start($)
  await enrich($, 'keys install')
  expect(w.files[`${KEYS_PATH}.bak`]).toBe(existing)
  expect(JSON.parse(w.files[KEYS_PATH] ?? '{}').bindings[0].bindings).toEqual({ 'ctrl+g': 'chat:externalEditor', 'ctrl+x e': 'diff:back' })
})

test('the model and effort come from the config', { options: { quickModel: 'haiku', quickEffort: 'medium' } }, async ($, on) => {
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
