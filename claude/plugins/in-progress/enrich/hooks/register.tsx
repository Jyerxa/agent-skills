import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelCompleteResult, ModelEffort, PluginOptions, Register, RenderElement, Timer } from 'claude-code'

import type { EnrichBinding, EnrichJob, EnrichPass, EnrichResult } from '../types'
import { classifyDraft } from './draft'
import { chordFor, labelChord, mergeBindings } from './keys'
import { QUICK, wrapDraft } from './meta'
import { parseReply } from './parse'
import { droppedTokens } from './preserve'

/** The chord `/enrich keys install` binds to each pass's action. */
const DEFAULT_CHORD: Record<EnrichPass, string> = { quick: 'ctrl+x e', deep: 'ctrl+x d' }
const MAX_TOKENS = 4096
const TOAST_MS = 6000
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
  timeoutMs: number
  /** the engine action `ctrl+x e` is bound to (PRD A.8) */
  quickAction: string
}

type Dollar = Pick<EngineInterface, 'state' | 'prompt' | 'model' | 'clock' | 'ui' | 'store' | 'fs' | 'env'>

// ---------- module state: lost on a hot reload, which is fine; everything a draw needs is in $.state ----------

let cfg: Config = readConfig({})
let jobSeq = 0
let ticker: Timer | undefined
let abort: AbortController | undefined
/** mirrors resultAtom being set, so `prompt.edit` makes no $ call per keystroke */
let hasResult = false

function readConfig(o: PluginOptions): Config {
  const text = (key: string, fallback: string) => (typeof o[key] === 'string' && o[key].trim() !== '' ? o[key].trim() : fallback)
  const effort = EFFORTS.find(level => level === o['quickEffort'])
  return {
    quickModel: text('quickModel', 'sonnet'),
    quickEffort: effort ?? 'low',
    timeoutMs: typeof o['timeoutMs'] === 'number' && o['timeoutMs'] >= 1000 ? Math.floor(o['timeoutMs']) : 90_000,
    quickAction: text('quickAction', 'diff:back'),
  }
}

// ---------- keybindings ----------

async function keybindingsPath($: Dollar): Promise<string> {
  const configDir = await $.env.get('CLAUDE_CONFIG_DIR')
  if (configDir) return `${configDir.replace(/[\\/]+$/, '')}/keybindings.json`
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '~'
  return `${home.replace(/[\\/]+$/, '')}/.claude/keybindings.json`
}

/** The keybindings file's text, or null when there is none. */
async function readKeybindings($: Dollar, path: string): Promise<string | null> {
  try {
    const text = await $.fs.read(path)
    return typeof text === 'string' ? text : null
  } catch {
    return null
  }
}

async function refreshBinding($: Dollar): Promise<EnrichBinding> {
  const text = await readKeybindings($, await keybindingsPath($))
  const binding: EnrichBinding = { quick: chordFor(text, cfg.quickAction), deep: null }
  await update($, bindingAtom, () => binding)
  return binding
}

// ---------- passes ----------

async function setResult($: Dollar, result: EnrichResult | null): Promise<void> {
  hasResult = result !== null
  await update($, resultAtom, () => result)
}

function stopTimers(): void {
  ticker?.cancel()
  ticker = undefined
  abort?.abort()
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
 * A pass's chord (PRD A.3): cancel a running pass; on the untouched result,
 * the same pass puts the original back and another runs from the original;
 * otherwise start the pass on the draft.
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
  const job: EnrichJob = { id: jobSeq, pass, source, box, startedAt: await $.clock.now() }
  stopTimers()
  await update($, elapsedAtom, () => 0)
  await update($, jobAtom, () => job)
  ticker = $.clock.every(1000, () => void tick($))
  // the call runs from a timer, never inside the press's own dispatch (PRD A.4)
  $.clock.after(0, () => void runJob($, job))
}

const isCurrent = async ($: Dollar, job: EnrichJob): Promise<boolean> => (await read($, jobAtom))?.id === job.id

async function runJob($: Dollar, job: EnrichJob): Promise<void> {
  if (!(await isCurrent($, job))) return
  const controller = new AbortController()
  abort = controller
  let reply: ModelCompleteResult
  try {
    reply = await $.model.complete(
      {
        model: cfg.quickModel,
        system: [{ text: QUICK, cache: true }],
        prompt: wrapDraft(job.source),
        maxTokens: MAX_TOKENS,
        effort: cfg.quickEffort,
        timeoutMs: cfg.timeoutMs,
      },
      { signal: controller.signal },
    )
  } catch (error) {
    if (!(await isCurrent($, job))) return
    await endJob($)
    $.ui.toast(`enrich: the ${job.pass} pass could not run (${error instanceof Error ? error.message : String(error)}); your draft is untouched`, { timeoutMs: TOAST_MS })
    return
  }
  if (!(await isCurrent($, job))) return // cancelled while it ran
  await endJob($)
  await land($, job, reply, cfg.quickModel)
}

function failure(reply: Exclude<ModelCompleteResult, { isAnswered: true }>): string {
  if (reply.reason === 'api-error') return `${reply.error}${reply.status ? ` ${reply.status}` : ''}`
  if (reply.reason === 'aborted') return `no reply within ${Math.round(cfg.timeoutMs / 1000)}s`
  return 'an empty reply'
}

/** A finished pass: into the box, but only over the exact text it started from (PRD F7, F9). */
async function land($: Dollar, job: EnrichJob, reply: ModelCompleteResult, model: string): Promise<void> {
  if (!reply.isAnswered) {
    $.ui.toast(`enrich: the ${job.pass} pass failed (${failure(reply)}); your draft is untouched`, { timeoutMs: TOAST_MS })
    return
  }
  const improved = parseReply(reply.text)
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
    dropped: droppedTokens(job.source, improved),
  })
}

// ---------- /enrich ----------

const snippet = (pass: EnrichPass, action: string) => `{ "context": "Chat", "bindings": { "${DEFAULT_CHORD[pass]}": "${action}" } }`

async function help($: Dollar): Promise<string> {
  const binding = await refreshBinding($)
  const chordLine = binding.quick
    ? `${labelChord(binding.quick)} runs a quick pass on the draft in the prompt box. The result replaces the draft; ${labelChord(binding.quick)} again puts your original back.`
    : `The quick-pass chord is not bound yet: run /enrich keys install to bind ${DEFAULT_CHORD.quick}.`
  return `enrich: ${chordLine}\n${USAGE}`
}

async function keysStatus($: Dollar): Promise<string> {
  const binding = await refreshBinding($)
  if (binding.quick) return `enrich: quick pass is ${binding.quick} (${cfg.quickAction}).`
  return [
    `enrich: the quick pass (${cfg.quickAction}) has no chord. Run /enrich keys install, or add this to ${await keybindingsPath($)}:`,
    snippet('quick', cfg.quickAction),
  ].join('\n')
}

async function keysInstall($: Dollar): Promise<string> {
  const path = await keybindingsPath($)
  const before = await readKeybindings($, path)
  const merged = mergeBindings(before, [{ chord: DEFAULT_CHORD.quick, action: cfg.quickAction }])
  if ('error' in merged) return `enrich: ${merged.error}; nothing written. Add this by hand:\n${snippet('quick', cfg.quickAction)}`
  const lines: string[] = []
  if (merged.added.length > 0) {
    if (before !== null) await $.fs.write(`${path}.bak`, before)
    await $.fs.write(path, merged.text)
    lines.push(`enrich: bound ${merged.added.join(', ')} in ${path}${before !== null ? ` (the previous file is at ${path}.bak)` : ''}.`)
  }
  if (merged.already.length > 0) lines.push(`enrich: already bound: ${merged.already.join(', ')}.`)
  if (merged.conflicts.length > 0) lines.push(`enrich: not bound: ${merged.conflicts.join('; ')}. Set quickAction's chord by hand in ${path}.`)
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
    const pass: EnrichPass = 'quick'
    const label = binding.quick ? labelChord(binding.quick) : null
    const button = (word: string) => (
      <Button key={`enrich-${pass}`} action={cfg.quickAction} plain dimColor onPress={() => void chord($, pass)}>
        {label ? `${label} ${word}` : word}
      </Button>
    )
    const spark = <Text key="spark" color="claude">✦ </Text>
    let right: RenderElement[]
    if (job) {
      right = [spark, <Text key="state" dimColor>{`${job.pass} pass · ${elapsed}s · `}</Text>, button('cancel')]
    } else if (result) {
      right = [spark, <Text key="state" dimColor>{`${result.pass} · ${result.original.length} → ${result.text.length} chars · `}</Text>]
      if (result.dropped.length > 0) right.push(<Text key="dropped" color="warning">{`⚠ dropped ${result.dropped.join(', ')} · `}</Text>)
      right.push(button('undo'))
    } else {
      right = [button('quick')]
      if (!label) right.push(<Text key="unbound" dimColor>{` · ${labelChord(DEFAULT_CHORD.quick)} unbound: /enrich keys install`}</Text>)
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
