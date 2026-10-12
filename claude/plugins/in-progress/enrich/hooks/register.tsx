import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelEffort, ModelForkResult, PluginOptions, Register, RenderElement, Timer } from 'claude-code'

import type { EnrichBinding, EnrichJob, EnrichPass, EnrichResult } from '../types'
import { classifyDraft } from './draft'
import { chordFor, labelChord, mergeBindings } from './keys'
import { type Answered, deepPrompt, houseStyle, instructions, MAX_QUESTIONS, wrapDraft, writeMessage } from './meta'
import { parsePlan, parseReply, type Question } from './parse'
import { droppedTokens } from './preserve'

const PASSES: readonly EnrichPass[] = ['quick', 'deep']
const OTHER: Record<EnrichPass, EnrichPass> = { quick: 'deep', deep: 'quick' }
/** The chord `/enrich keys install` binds to each pass's action. */
const DEFAULT_CHORD: Record<EnrichPass, string> = { quick: 'ctrl+x e', deep: 'ctrl+x d' }
const DEFAULT_ACTION: Record<EnrichPass, string> = { quick: 'diff:back', deep: 'diff:nextSource' }
/** what a result made by a fork of the session records as its model */
const FORK = 'session'
/** the option every deep question ends with, before the dialog's own Other */
const YOU_DECIDE = 'You decide'
const RECOMMENDED = ' (Recommended)'
const MAX_TOKENS = 4096
const TOAST_MS = 6000
/** a house style file is read up to this many characters */
const STYLE_MAX_CHARS = 8000
const USAGE = 'Commands: /enrich, /enrich keys, /enrich keys install, /enrich original, /enrich last.'

// ---------- session state, held by the engine (survives a hot reload); declared in ../types ----------

const jobAtom = atom({ plugin: 'enrich', key: 'job' } as const, null as EnrichJob | null)
const elapsedAtom = atom({ plugin: 'enrich', key: 'elapsed' } as const, 0)
const resultAtom = atom({ plugin: 'enrich', key: 'result' } as const, null as EnrichResult | null)
const bindingAtom = atom({ plugin: 'enrich', key: 'binding' } as const, { quick: null, deep: null } as EnrichBinding)

const EFFORTS: readonly ModelEffort[] = ['low', 'medium', 'high', 'xhigh', 'max']

export type Config = {
  quickModel: string
  quickEffort: ModelEffort
  /** the deep pass's model when there is no conversation to fork */
  deepFallbackModel: string
  timeoutMs: number
  /** the engine action each pass's chord is bound to (PRD A.8) */
  action: Record<EnrichPass, string>
  houseStyle: boolean
}

type Dollar = Pick<EngineInterface, 'state' | 'prompt' | 'model' | 'clock' | 'ui' | 'store' | 'fs' | 'env' | 'session'>

// ---------- module state: lost on a hot reload, which is fine; everything a draw needs is in $.state ----------

let cfg: Config = readConfig({})
let jobSeq = 0
let ticker: Timer | undefined
/** fails the pass in flight at `timeoutMs`; a fork takes no signal, so this is its timeout */
let deadline: Timer | undefined
let abort: AbortController | undefined
/** mirrors resultAtom being set, so `prompt.edit` makes no $ call per keystroke */
let hasResult = false

function readConfig(o: PluginOptions): Config {
  const text = (key: string, fallback: string) => (typeof o[key] === 'string' && o[key].trim() !== '' ? o[key].trim() : fallback)
  const quickAction = text('quickAction', DEFAULT_ACTION.quick)
  const deepAction = text('deepAction', DEFAULT_ACTION.deep)
  return {
    quickModel: text('quickModel', 'sonnet'),
    quickEffort: EFFORTS.find(level => level === o['quickEffort']) ?? 'low',
    deepFallbackModel: text('deepFallbackModel', 'opus'),
    timeoutMs: typeof o['timeoutMs'] === 'number' && o['timeoutMs'] >= 1000 ? Math.floor(o['timeoutMs']) : 90_000,
    // two Buttons on one action would share one chord: keep them apart
    action: { quick: quickAction, deep: deepAction === quickAction ? PASSES.map(p => DEFAULT_ACTION[p]).find(a => a !== quickAction) ?? deepAction : deepAction },
    houseStyle: o['houseStyle'] !== false,
  }
}

// ---------- files: keybindings and house style ----------

const trimSlash = (path: string) => path.replace(/[\\/]+$/, '')

/** The person's Claude folder: CLAUDE_CONFIG_DIR, else ~/.claude. */
async function configDir($: Dollar): Promise<string> {
  const dir = await $.env.get('CLAUDE_CONFIG_DIR')
  if (dir) return trimSlash(dir)
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '~'
  return `${trimSlash(home)}/.claude`
}

const keybindingsPath = async ($: Dollar) => `${await configDir($)}/keybindings.json`

/** A file's text, or null when there is none. */
async function readText($: Dollar, path: string): Promise<string | null> {
  try {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : null
  } catch {
    return null
  }
}

async function refreshBinding($: Dollar): Promise<EnrichBinding> {
  const text = await readText($, await keybindingsPath($))
  const binding: EnrichBinding = { quick: chordFor(text, cfg.action.quick), deep: chordFor(text, cfg.action.deep) }
  await update($, bindingAtom, () => binding)
  return binding
}

/** `~/.claude/enrich.md` and `<root>/.claude/enrich.md`, read on every pass so edits apply at once (PRD F20). */
async function readHouseStyle($: Dollar): Promise<string> {
  if (!cfg.houseStyle) return ''
  const yoursPath = `${await configDir($)}/enrich.md`
  const projectPath = `${trimSlash(await $.session.root())}/.claude/enrich.md`
  const cap = (text: string | null) => (text === null ? null : text.slice(0, STYLE_MAX_CHARS))
  const yours = cap(await readText($, yoursPath))
  const project = projectPath.replace(/\\/g, '/') === yoursPath.replace(/\\/g, '/') ? null : cap(await readText($, projectPath))
  return houseStyle(yours, project)
}

// ---------- passes ----------

async function setResult($: Dollar, result: EnrichResult | null): Promise<void> {
  hasResult = result !== null
  await update($, resultAtom, () => result)
}

function stopTimers(): void {
  ticker?.cancel()
  deadline?.cancel()
  abort?.abort()
  ticker = undefined
  deadline = undefined
  abort = undefined
}

async function endJob($: Dollar): Promise<void> {
  stopTimers()
  await update($, jobAtom, () => null)
  await update($, elapsedAtom, () => 0)
}

async function tick($: Dollar): Promise<void> {
  await update($, elapsedAtom, n => n + 1)
}

/**
 * A pass's chord (PRD A.3): either chord cancels a running pass; on the
 * untouched result, the same pass puts the original back and the other runs
 * from the original; otherwise the pass runs on the draft.
 */
async function chord($: Dollar, pass: EnrichPass): Promise<void> {
  const running = await read($, jobAtom)
  if (running) {
    await endJob($)
    $.ui.toast(`enrich: ${running.pass} pass cancelled; your draft is untouched`)
    return
  }
  const box = await $.prompt.read()
  const result = await read($, resultAtom)
  if (result && box.text === result.text) {
    if (pass === result.pass) {
      const back = await $.prompt.fill({ text: result.original })
      if (back.isFilled) await setResult($, null)
      else $.ui.toast(`enrich: the prompt box did not take your original${back.refusal ? ` (${back.refusal})` : ''}; /enrich original puts it there`)
      return
    }
    await setResult($, null)
    await startJob($, pass, result.original, box.text)
    return
  }
  const kind = classifyDraft(box.text)
  if (kind === 'empty') return
  if (kind !== 'ok') {
    $.ui.toast(`enrich: leaves ${kind === 'command' ? 'slash commands' : 'bash lines'} alone`)
    return
  }
  if (result) await setResult($, null)
  await startJob($, pass, box.text, box.text)
}

async function startJob($: Dollar, pass: EnrichPass, source: string, box: string): Promise<void> {
  jobSeq += 1
  const job: EnrichJob = { id: jobSeq, pass, source, box, startedAt: await $.clock.now(), phase: 'reading', asked: 0, questions: 0 }
  stopTimers()
  await update($, elapsedAtom, () => 0)
  await update($, jobAtom, () => job)
  // the calls run from a timer, never inside the press's own dispatch (PRD A.4)
  $.clock.after(0, () => void runJob($, job))
}

const isCurrent = async ($: Dollar, job: EnrichJob): Promise<boolean> => (await read($, jobAtom))?.id === job.id

const seconds = (ms: number) => `${Math.round(ms / 1000)}s`

/** The pass in flight, as `job` with the fields changed, unless another took its place. */
async function patchJob($: Dollar, job: EnrichJob, patch: Partial<Pick<EnrichJob, 'phase' | 'asked' | 'questions'>>): Promise<void> {
  await update($, jobAtom, current => (current && current.id === job.id ? { ...current, ...patch } : current))
}

/**
 * Before each model call: the seconds count from 0 and the deadline is armed.
 * Neither runs while the person answers a question.
 */
async function beginCall($: Dollar, job: EnrichJob, phase: 'reading' | 'writing'): Promise<void> {
  endCall()
  await update($, elapsedAtom, () => 0)
  await patchJob($, job, { phase })
  ticker = $.clock.every(1000, () => void tick($))
  deadline = $.clock.after(cfg.timeoutMs, () => void timedOut($, job))
}

function endCall(): void {
  ticker?.cancel()
  deadline?.cancel()
  ticker = undefined
  deadline = undefined
}

async function timedOut($: Dollar, job: EnrichJob): Promise<void> {
  const current = await read($, jobAtom)
  if (current?.id !== job.id || current.phase === 'asking') return
  await fail($, job, `no reply within ${seconds(cfg.timeoutMs)}`)
}

/** Ends the pass in flight with a toast saying why; the draft is never touched. */
async function fail($: Dollar, job: EnrichJob, why: string): Promise<void> {
  await endJob($)
  $.ui.toast(`enrich: the ${job.pass} pass failed (${why}); your draft is untouched`, { timeoutMs: TOAST_MS })
}

/** One completion, cancellable through the module's `abort`. */
async function complete($: Dollar, model: string, system: string, prompt: string, effort: ModelEffort | undefined): Promise<ModelForkResult> {
  const controller = new AbortController()
  abort = controller
  return $.model.complete(
    { model, system: [{ text: system, cache: true }], prompt, maxTokens: MAX_TOKENS, ...(effort ? { effort } : {}), timeoutMs: cfg.timeoutMs },
    { signal: controller.signal },
  )
}

function failure(reply: Exclude<ModelForkResult, { isAnswered: true }>): string {
  if (reply.reason === 'api-error') return `${reply.error}${reply.status ? ` ${reply.status}` : ''}`
  if (reply.reason === 'aborted') return `no reply within ${seconds(cfg.timeoutMs)}`
  if (reply.reason === 'nothing-to-fork') return 'no conversation to read yet'
  return 'an empty reply'
}

async function runJob($: Dollar, job: EnrichJob): Promise<void> {
  if (!(await isCurrent($, job))) return
  try {
    if (job.pass === 'quick') await runQuick($, job)
    else await runDeep($, job)
  } catch (error) {
    if (await isCurrent($, job)) await fail($, job, `could not run: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/** Quick: one completion. */
async function runQuick($: Dollar, job: EnrichJob): Promise<void> {
  const style = await readHouseStyle($)
  await beginCall($, job, 'reading')
  const reply = await complete($, cfg.quickModel, instructions('quick', style), wrapDraft(job.source), cfg.quickEffort)
  if (!(await isCurrent($, job))) return // cancelled or timed out while it ran
  if (!reply.isAnswered) return fail($, job, failure(reply))
  await endJob($)
  await land($, job, parseReply(reply.text), cfg.quickModel, 0)
}

/**
 * One step of the deep pass: a fork of the session, which reads the whole
 * conversation, or with nothing to fork yet one completion on the fallback
 * model, which then takes every later step. Null when the pass ended.
 */
async function deepStep(
  $: Dollar,
  job: EnrichJob,
  step: 'plan' | 'write',
  style: string,
  message: string,
  model: string,
): Promise<{ text: string; model: string } | null> {
  if (!(await isCurrent($, job))) return null
  await beginCall($, job, step === 'plan' ? 'reading' : 'writing')
  let reply: ModelForkResult = { isAnswered: false, reason: 'nothing-to-fork' }
  if (model === FORK) reply = await $.model.fork({ prompt: deepPrompt(step, style, message) })
  if (!reply.isAnswered && reply.reason === 'nothing-to-fork') {
    if (!(await isCurrent($, job))) return null
    model = cfg.deepFallbackModel
    reply = await complete($, model, instructions(step, style), message, undefined)
  }
  if (!(await isCurrent($, job))) return null // cancelled or timed out while it ran
  endCall()
  if (!reply.isAnswered) {
    await fail($, job, failure(reply))
    return null
  }
  return { text: reply.text, model }
}

/**
 * Deep (PRD §4.4.1): plan, ask, write. One step reads the conversation and
 * the draft and plans up to four questions, or writes at once when nothing is
 * missing. The questions then come back to back in Claude Code's own dialog,
 * and one more step writes the prompt with the answers.
 */
async function runDeep($: Dollar, job: EnrichJob): Promise<void> {
  const style = await readHouseStyle($)
  const planned = await deepStep($, job, 'plan', style, wrapDraft(job.source), FORK)
  if (!planned) return
  const plan = parsePlan(planned.text)
  if (plan.kind === 'none') return fail($, job, 'a reply with no questions and no prompt')
  if (plan.kind === 'prompt') {
    await endJob($)
    return land($, job, plan.text, planned.model, 0)
  }
  const questions = plan.questions.slice(0, MAX_QUESTIONS)
  const answered: Answered[] = []
  for (const [i, question] of questions.entries()) {
    const answer = await ask($, job, question, i + 1, questions.length)
    if (answer === null) return
    answered.push({ header: question.header, question: question.question, answer })
  }
  const written = await deepStep($, job, 'write', style, writeMessage(job.source, answered), planned.model)
  if (!written) return
  const result = parsePlan(written.text)
  if (result.kind !== 'prompt') return fail($, job, 'the written reply held no prompt')
  await endJob($)
  await land($, job, result.text, written.model, answered.length)
}

/**
 * One question in the engine's own dialog: the model's answers, the likely one
 * marked, then "You decide"; the dialog adds Other. Esc cancels the pass (null).
 */
async function ask($: Dollar, job: EnrichJob, question: Question, n: number, of: number): Promise<string | null> {
  await patchJob($, job, { phase: 'asking', asked: n, questions: of })
  const offered = question.options.filter(o => o.toLowerCase() !== YOU_DECIDE.toLowerCase()).slice(0, 3)
  const options = [...offered.map((o, i) => (i === 0 ? `${o}${RECOMMENDED}` : o)), YOU_DECIDE]
  let answer: string
  try {
    answer = await $.ui.ask(question.question, { options, header: question.header })
  } catch {
    if (await isCurrent($, job)) {
      await endJob($)
      $.ui.toast('enrich: deep pass cancelled; your draft is untouched')
    }
    return null
  }
  if (!(await isCurrent($, job))) return null
  const picked = answer.endsWith(RECOMMENDED) ? answer.slice(0, -RECOMMENDED.length) : answer
  return picked.trim() === '' || picked === YOU_DECIDE ? 'You decide (left to Claude Code)' : picked.trim()
}

/** A finished pass: into the box, but only over the exact text it started from (PRD F7, F9). */
async function land($: Dollar, job: EnrichJob, improved: string, model: string, answers: number): Promise<void> {
  if (improved === '') {
    $.ui.toast(`enrich: the ${job.pass} pass came back empty; your draft is untouched`, { timeoutMs: TOAST_MS })
    return
  }
  await $.store.set('last', { original: job.source, text: improved })
  const box = await $.prompt.read()
  if (box.text !== job.box) {
    $.ui.toast('enrich: the draft changed while the pass ran, so the result was not applied (/enrich last puts it in the box)', { timeoutMs: TOAST_MS })
    return
  }
  const filled = await $.prompt.fill({ text: improved })
  if (!filled.isFilled) {
    $.ui.toast(`enrich: the prompt box did not take the result${filled.refusal ? ` (${filled.refusal})` : ''}; /enrich last puts it there`, { timeoutMs: TOAST_MS })
    return
  }
  await setResult($, {
    pass: job.pass,
    original: job.source,
    text: filled.text || improved,
    model,
    answers,
    dropped: droppedTokens(job.source, improved),
  })
}

// ---------- /enrich ----------

const snippet = () =>
  `{ "context": "Chat", "bindings": { ${PASSES.map(pass => `"${DEFAULT_CHORD[pass]}": "${cfg.action[pass]}"`).join(', ')} } }`

async function help($: Dollar): Promise<string> {
  const binding = await refreshBinding($)
  const line = (pass: EnrichPass, what: string) => {
    const bound = binding[pass]
    return bound ? `${labelChord(bound)} ${what}` : `${pass} pass: no chord yet (/enrich keys install binds ${DEFAULT_CHORD[pass]})`
  }
  return [
    'enrich improves the draft in the prompt box in place; the same chord again puts your original back.',
    line('quick', 'runs a quick pass: spelling, an explicit ask, the same shape.'),
    line('deep', 'runs a deep pass: reads the conversation and restructures the draft, open questions last.'),
    USAGE,
  ].join('\n')
}

async function keysStatus($: Dollar): Promise<string> {
  const binding = await refreshBinding($)
  const lines = PASSES.map(pass => `enrich: ${pass} pass: ${binding[pass] ?? 'no chord'} (${cfg.action[pass]}).`)
  if (PASSES.some(pass => binding[pass] === null)) {
    lines.push(`Run /enrich keys install, or add this to ${await keybindingsPath($)}:`, snippet())
  }
  return lines.join('\n')
}

async function keysInstall($: Dollar): Promise<string> {
  const path = await keybindingsPath($)
  const before = await readText($, path)
  const merged = mergeBindings(
    before,
    PASSES.map(pass => ({ chord: DEFAULT_CHORD[pass], action: cfg.action[pass] })),
  )
  if ('error' in merged) return `enrich: ${merged.error}; nothing written. Add this by hand:\n${snippet()}`
  const lines: string[] = []
  if (merged.added.length > 0) {
    if (before !== null) await $.fs.write(`${path}.bak`, before)
    await $.fs.write(path, merged.text)
    lines.push(`enrich: bound ${merged.added.join(', ')} in ${path}${before !== null ? ` (the previous file is at ${path}.bak)` : ''}.`)
  }
  if (merged.already.length > 0) lines.push(`enrich: already bound: ${merged.already.join(', ')}.`)
  if (merged.conflicts.length > 0) lines.push(`enrich: not bound: ${merged.conflicts.join('; ')}. Bind another chord by hand in ${path}.`)
  await refreshBinding($)
  return lines.join('\n')
}

async function restore($: Dollar, which: 'original' | 'last'): Promise<string> {
  const last = (await $.store.get('last')) as { original?: unknown; text?: unknown } | undefined
  const text = which === 'original' ? last?.original : last?.text
  const name = which === 'original' ? 'your last original draft' : 'the last result'
  if (typeof text !== 'string') return 'enrich: nothing kept yet.'
  const filled = await $.prompt.fill({ text })
  return filled.isFilled ? `enrich: put ${name} in the prompt box.` : `enrich: the prompt box did not take ${name}${filled.refusal ? ` (${filled.refusal})` : ''}.`
}

async function runCommand($: Dollar, args: string): Promise<string> {
  const verb = args.trim().toLowerCase().replace(/\s+/g, ' ')
  if (verb === '') return help($)
  if (verb === 'keys') return keysStatus($)
  if (verb === 'keys install') return keysInstall($)
  if (verb === 'original' || verb === 'last') return restore($, verb)
  return `enrich: no such command "${args.trim()}". ${USAGE}`
}

// ---------- hooks ----------

export const register: Register = (on, options) => {
  cfg = readConfig(options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'enrich',
      description: 'Improve the draft prompt in place: keys, keys install, original, last',
      argumentHint: 'keys | keys install | original | last',
    })
    // a pass a reload cut short has no timer or call left to finish it
    stopTimers()
    await update($, jobAtom, () => null)
    await update($, elapsedAtom, () => 0)
    hasResult = (await read($, resultAtom)) !== null
    await refreshBinding($)
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await endJob($)
    return next(e)
  })

  on('command.run', { command: 'enrich' }, async ($, e) => ({ text: await runCommand($, e.args) }))

  // the person's first change to a result retires its hint (PRD F9, F11)
  on('prompt.edit', ($, e, next) => {
    if (hasResult && (e.inputText !== '' || e.start !== e.end)) void setResult($, null)
    return next(e)
  })

  // the chords' Buttons and the pass's state, at the right end of the hint line under the prompt
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const below = (await next(e)) as RenderElement
    const [job, result, elapsed, binding] = await Promise.all([read($, jobAtom), read($, resultAtom), read($, elapsedAtom), read($, bindingAtom)])
    if (!e.props.isDraft && job === null) return below
    const { Box, Text, Button } = $.ui.resolve(e)
    const button = (pass: EnrichPass, word: string) => {
      const bound = binding[pass]
      return (
        <Button key={`enrich-${pass}`} action={cfg.action[pass]} plain dimColor onPress={() => void chord($, pass)}>
          {bound ? `${labelChord(bound)} ${word}` : word}
        </Button>
      )
    }
    const dim = (key: string, text: string) => (
      <Text key={key} dimColor>
        {text}
      </Text>
    )
    const spark = (
      <Text key="spark" color="claude">
        ✦{' '}
      </Text>
    )
    let right: RenderElement[]
    if (job?.phase === 'asking') {
      // the question dialog holds the keys; Esc there cancels
      right = [spark, dim('state', `deep · question ${job.asked} of ${job.questions} · esc cancels`)]
    } else if (job) {
      const doing = job.pass === 'quick' ? 'quick pass' : `deep · ${job.phase}`
      // the other pass's Button stays mounted, hidden, so either chord cancels
      const other = OTHER[job.pass]
      right = [
        spark,
        dim('state', `${doing} · ${elapsed}s · `),
        button(job.pass, 'cancel'),
        <Box key={`hidden-${other}`} display="none">
          {button(other, 'cancel')}
        </Box>,
      ]
    } else if (result) {
      const other = OTHER[result.pass]
      const via = result.pass === 'deep' && result.model !== FORK ? ` · ${result.model}` : ''
      const answers = result.answers > 0 ? ` · ${result.answers} answer${result.answers === 1 ? '' : 's'}` : ''
      right = [spark, dim('state', `${result.pass}${via}${answers} · ${result.original.length} → ${result.text.length} chars · `)]
      if (result.dropped.length > 0) {
        right.push(
          <Text key="dropped" color="warning">
            {`⚠ dropped ${result.dropped.join(', ')} · `}
          </Text>,
        )
      }
      right.push(button(result.pass, 'undo'), dim('sep', ' · '), button(other, other))
    } else {
      right = [button('quick', 'quick'), dim('sep', ' · '), button('deep', 'deep')]
      const unbound = PASSES.filter(pass => binding[pass] === null)
      if (unbound.length > 0) {
        const chords = unbound.length === 2 ? '⌃x e/d' : labelChord(DEFAULT_CHORD[unbound[0] ?? 'quick'])
        right.push(dim('unbound', ` · ${chords} unbound · /enrich keys install`))
      }
    }
    return (
      <Box flexDirection="row">
        <Box flexGrow={1}>{below}</Box>
        <Box flexDirection="row" flexShrink={0}>
          {right}
        </Box>
      </Box>
    )
  })
}
