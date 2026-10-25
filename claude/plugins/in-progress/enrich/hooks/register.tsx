import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelEffort, PluginOptions, Register, RenderElement, Timer } from 'claude-code'

import type { EnrichLast } from '../types'

/** The settings' defaults; keep them in step with plugin.json (the tests check). */
export const DEFAULT_MODEL = 'claude-sonnet-5-5'
export const DEFAULT_EFFORT: ModelEffort = 'low'
const EFFORTS: readonly ModelEffort[] = ['low', 'medium', 'high', 'xhigh', 'max']
/**
 * The engine action the chord borrows. Plugins can't register actions of
 * their own; only the diff dialog handles this one, and it blocks the prompt.
 */
export const ACTION = 'diff:back'
const TIMEOUT_MS = 30_000

/** The `instructions` setting's default: how the draft is rewritten. */
export const DEFAULT_INSTRUCTIONS =
  "Rewrite it for clarity. Fix spelling and grammar. Make the ask explicit: what to do, and to what. Turn several separate asks into a short list; otherwise keep prose. Keep the author's voice, terms and hedges (\"maybe\", \"not sure\"). Add nothing the draft doesn't say: no new requirements, files or names."

/**
 * The system prompt: the person's instructions inside a frame no setting
 * changes, which keeps the reply a prompt the box can take.
 */
export const system = (instructions: string): string => `You rewrite a developer's draft prompt for Claude Code, an AI coding assistant that will act on it in their repository. Never answer the draft or do the work it asks for. Return the draft, rewritten as these instructions say:

<instructions>
${instructions}
</instructions>

Whatever the instructions say, keep @mentions, file paths, code, URLs, error messages and placeholders such as [Image #1] exactly as written. Reply with the rewritten prompt only: no preamble, no commentary, no code fence.`

export const MESSAGE = 'Claude is enriching…'
/** the shimmer moves one cell this often */
const SHIMMER_MS = 100
/** Claude's accent, and the light the shimmer brightens it to */
const BASE = [0xd9, 0x77, 0x57]
const PEAK = [0xf5, 0xd0, 0xbf]

const busyAtom = atom({ plugin: 'enrich', key: 'busy' } as const, false)
const phaseAtom = atom({ plugin: 'enrich', key: 'phase' } as const, 0)

/** Module state: a reload drops it, and the chord then rewrites rather than restores. */
let last: EnrichLast | null = null
let shimmer: Timer | undefined

type Dollar = Pick<EngineInterface, 'state' | 'prompt' | 'model' | 'ui' | 'clock'>

type Config = { model: string; effort: ModelEffort; system: string }

function readConfig(o: PluginOptions): Config {
  const text = (key: string) => (typeof o[key] === 'string' ? o[key].trim() : '')
  return {
    model: text('model') || DEFAULT_MODEL,
    effort: EFFORTS.find(level => level === o['effort']) ?? DEFAULT_EFFORT,
    system: system(text('instructions') || DEFAULT_INSTRUCTIONS),
  }
}

/** The color `t` of the way from BASE to PEAK. */
const shade = (t: number): string =>
  `#${BASE.map((c, i) => Math.round(c + ((PEAK[i] ?? c) - c) * t).toString(16).padStart(2, '0')).join('')}`

/**
 * A soft band of light, three cells each side, sweeping across `text` one cell
 * per phase and leaving fully before it comes round again; neighbouring cells
 * of one shade are one run.
 */
export function shimmerRuns(text: string, phase: number): { text: string; color: string }[] {
  const chars = [...text]
  const head = (phase % (chars.length + 6)) - 3
  const runs: { text: string; color: string }[] = []
  chars.forEach((ch, i) => {
    const t = Math.max(0, 1 - Math.abs(i - head) / 3)
    const color = shade(Math.round(t * t * (3 - 2 * t) * 4) / 4)
    const run = runs.at(-1)
    if (run?.color === color) run.text += ch
    else runs.push({ text: ch, color })
  })
  return runs
}

function stopShimmer(): void {
  shimmer?.cancel()
  shimmer = undefined
}

async function enrich($: Dollar, cfg: Config): Promise<void> {
  if (await read($, busyAtom)) return
  const draft = (await $.prompt.read()).text
  if (last && draft === last.text) {
    await $.prompt.fill({ text: last.original })
    last = null
    return
  }
  // slash commands and bash lines are left alone
  if (draft.trim() === '' || /^\s*[/!]/.test(draft)) return
  await update($, phaseAtom, () => 0)
  await update($, busyAtom, () => true)
  shimmer = $.clock.every(SHIMMER_MS, () => void update($, phaseAtom, n => n + 1))
  try {
    const reply = await $.model.complete({
      model: cfg.model,
      system: [{ text: cfg.system, cache: true }],
      prompt: draft,
      effort: cfg.effort,
      timeoutMs: TIMEOUT_MS,
    })
    if (!reply.isAnswered) {
      $.ui.toast(`enrich: ${reply.reason === 'api-error' ? reply.error : reply.reason}; your draft is untouched`)
      return
    }
    if ((await $.prompt.read()).text !== draft) {
      $.ui.toast('enrich: the draft changed while it was rewritten, so it was left as it is')
      return
    }
    const text = reply.text.trim()
    const filled = await $.prompt.fill({ text })
    if (filled.isFilled) last = { original: draft, text: filled.text || text }
  } finally {
    stopShimmer()
    await update($, busyAtom, () => false)
  }
}

export const register: Register = (on, options) => {
  // a change in /config reloads the module, so this reads the new values
  const cfg = readConfig(options)

  // a reload mid-call leaves busy set, with no call left to clear it
  on('session.start', async ($, e, next) => {
    stopShimmer()
    await update($, busyAtom, () => false)
    return next(e)
  })

  // the chord's Button, at the right end of the hint line under the prompt
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const line = (await next(e)) as RenderElement
    const [busy, phase] = await Promise.all([read($, busyAtom), read($, phaseAtom)])
    if (!e.props.isDraft && !busy) return line
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="row">
        <Box flexGrow={1}>{line}</Box>
        {busy ? (
          <Box flexDirection="row" flexShrink={0}>
            <Text color="claude">✦ </Text>
            {shimmerRuns(MESSAGE, phase).map((run, i) => (
              <Text key={`run-${i}`} color={run.color}>
                {run.text}
              </Text>
            ))}
          </Box>
        ) : (
          // the call runs from a timer, never inside the press's own dispatch
          <Button key="enrich" action={ACTION} plain dimColor onPress={() => void $.clock.after(0, () => void enrich($, cfg))}>
            ⌃x r enrich
          </Button>
        )}
      </Box>
    )
  })
}
