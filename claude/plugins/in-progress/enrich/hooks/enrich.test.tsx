import type { ModelCompleteInput, ModelCompleteResult, On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { ACTION, DEFAULT_EFFORT, DEFAULT_INSTRUCTIONS, DEFAULT_MODEL, MESSAGE, shimmerRuns, system } from './register'

const DRAFT = 'the tree preview jumps back to the top every time i reopen a file. can we make it rember where i was'
const CLEAR = 'The tree preview jumps back to the top every time I reopen a file. Make it remember where I was.'

const USAGE = { input_tokens: 400, output_tokens: 40, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const answered = (text: string): ModelCompleteResult => ({ isAnswered: true, text, usage: USAGE })

/** A reply: at once, or after the mocked clock moves this far. */
type Reply = { result: ModelCompleteResult; afterMs?: number }

/** The world beneath the plugin: the prompt box, the model, toasts. */
type World = { box: { text: string }; replies: Reply[]; requests: ModelCompleteInput[]; toasts: string[] }

const newWorld = (text = DRAFT): World => ({ box: { text }, replies: [], requests: [], toasts: [] })

const beneath = (on: On, w: World) => {
  mock.store(on)
  const clock = mock.clock(on)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
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

const mountHint = async ($: Engine, surface: 'terminal' | 'desktop' = 'terminal') => {
  await $.session.start({ cwd: '/repo', surface, isInteractive: true })
  return $.ui.mount({ plugin: 'enrich', surface, component: 'PromptHint', requestId: 'hint', props: HINT })
}

type Hint = Awaited<ReturnType<typeof mountHint>>

const hintText = async (ui: Hint) => (await ui.findAll({ type: 'Text' })).map(t => t.text).join('')

/** Each run of the hint line with its color: what the shimmer moves. */
const hintRuns = async (ui: Hint) => (await ui.findAll({ type: 'Text' })).map(t => `${String(t.props['color'])}:${t.text}`).join(' ')

test('the shimmer is a band of light that sweeps across the message and leaves it', () => {
  const base = shimmerRuns(MESSAGE, 0)
  expect(base, 'before the band enters: one run, all the base color').toEqual([{ text: MESSAGE, color: '#d97757' }])
  const lit = shimmerRuns(MESSAGE, 8)
  expect(lit.map(r => r.text).join('')).toBe(MESSAGE)
  expect(lit.some(r => r.color === '#f5d0bf'), 'the peak is lit').toBe(true)
  expect(shimmerRuns(MESSAGE, [...MESSAGE].length + 6), 'round again: dark').toEqual(base)
})

test('the chord sits at the end of the hint line while a draft is typed, on terminal and desktop', async ($, on) => {
  beneath(on, newWorld())
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountHint($, surface)
    const button = await ui.find({ key: 'enrich' })
    expect(button?.text, surface).toBe('⌃x r enrich')
    expect(button?.props['action'], surface).toBe(ACTION)
    expect(await ui.find({ type: 'Text', text: '? for shortcuts' }), `${surface}: the engine's line stays`).toBeDefined()
    await ui.redraw({ ...HINT, isDraft: false })
    expect(await ui.find({ key: 'enrich' }), `${surface}: nothing without a draft`).toBeUndefined()
    await ui.unmount()
  }
})

test('the chord sends the draft to the model and puts the rewrite in the box; again puts the original back', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  w.replies.push({ result: answered(`\n${CLEAR}\n`), afterMs: 2000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich' })
  await clock.advance(1000)
  expect(await hintText(ui)).toContain(`✦ ${MESSAGE}`)
  expect(await ui.find({ key: 'enrich' }), 'the message stands in for the chord').toBeUndefined()
  expect(w.box.text, 'the draft stays while it is rewritten').toBe(DRAFT)
  const before = await hintRuns(ui)
  await clock.advance(300)
  expect(await hintRuns(ui), 'the shimmer moves').not.toBe(before)

  await clock.advance(700)
  expect(w.box.text).toBe(CLEAR)
  expect(await ui.find({ key: 'enrich' })).toBeDefined()
  expect(await hintText(ui)).not.toContain(MESSAGE)
  expect(w.requests[0]?.model, 'Sonnet 5.5 by default').toBe(DEFAULT_MODEL)
  expect(w.requests[0]?.effort).toBe(DEFAULT_EFFORT)
  // no options given: the manifest's defaults, which must match the module's
  expect(w.requests[0]?.systemBlocks).toEqual([{ text: system(DEFAULT_INSTRUCTIONS), cache: true }])
  expect(w.requests[0]?.prompt).toBe(DRAFT)

  await ui.press({ key: 'enrich' })
  await clock.settle()
  expect(w.box.text, 'undo').toBe(DRAFT)
  expect(w.requests, 'undo makes no call').toHaveLength(1)
})

const STYLE = 'Use headings. Add success criteria as a checklist.'

test('the settings pick the model, the effort and how the draft is rewritten', { options: { model: 'haiku', effort: 'medium', instructions: `  ${STYLE}\n` } }, async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  w.replies.push({ result: answered(CLEAR) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich' })
  await clock.settle()
  expect(w.requests[0]?.model).toBe('haiku')
  expect(w.requests[0]?.effort).toBe('medium')
  const sent = w.requests[0]?.systemBlocks?.[0]?.text ?? ''
  expect(sent, 'the instructions, trimmed, in the frame').toBe(system(STYLE))
  expect(sent).not.toContain(DEFAULT_INSTRUCTIONS)
  expect(sent, 'the frame stays').toContain('Reply with the rewritten prompt only')
  expect(w.box.text).toBe(CLEAR)
})

test('a cleared instructions field falls back to the default', { options: { instructions: '   ' } }, async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  w.replies.push({ result: answered(CLEAR) })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich' })
  await clock.settle()
  expect(w.requests[0]?.systemBlocks).toEqual([{ text: system(DEFAULT_INSTRUCTIONS), cache: true }])
})

test('a draft changed while it is rewritten is left alone', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  w.replies.push({ result: answered(CLEAR), afterMs: 2000 })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich' })
  await clock.advance(1000)
  w.box.text = `${DRAFT} and more`
  await clock.advance(1000)
  expect(w.box.text).toBe(`${DRAFT} and more`)
  expect(w.toasts).toEqual(['enrich: the draft changed while it was rewritten, so it was left as it is'])
})

test('an error leaves the draft alone and says why', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  w.replies.push({ result: { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage: USAGE } })
  const ui = await mountHint($)
  await ui.press({ key: 'enrich' })
  await clock.settle()
  expect(w.box.text).toBe(DRAFT)
  expect(w.toasts).toEqual(['enrich: overloaded; your draft is untouched'])
  expect(await ui.find({ key: 'enrich' }), 'ready again').toBeDefined()
})

test('slash commands and bash lines are left alone', async ($, on) => {
  const w = newWorld()
  const clock = beneath(on, w)
  const ui = await mountHint($)
  for (const text of ['/model sonnet', '  !ls -la']) {
    w.box.text = text
    await ui.press({ key: 'enrich' })
    await clock.settle()
    expect(w.box.text).toBe(text)
  }
  expect(w.requests).toHaveLength(0)
})
