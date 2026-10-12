export type EnrichPass = 'quick' | 'deep'

/** The pass in flight. */
export type EnrichJob = {
  id: number
  pass: EnrichPass
  /** the text being improved */
  source: string
  /** what the prompt box held when the pass started; it must still hold it for the result to land */
  box: string
  startedAt: number
  /** what it waits on: the model reading the draft (a quick pass, or the deep pass planning), the person answering, or the deep pass writing */
  phase: 'reading' | 'asking' | 'writing'
  /** the deep pass's question on screen, from 1 */
  asked: number
  /** how many questions the deep pass planned */
  questions: number
}

/** The result a pass put in the prompt box, held until the person's first edit. */
export type EnrichResult = {
  pass: EnrichPass
  /** the draft it replaced */
  original: string
  /** the box's text after the fill, as the engine reported it */
  text: string
  model: string
  /** questions the person answered on the way (deep) */
  answers: number
  /** tokens of the draft (mentions, paths, code, URLs, placeholders) the result lost */
  dropped: string[]
}

/** The chord bound to each pass's action, as written in keybindings.json; null when unbound. */
export type EnrichBinding = { quick: string | null; deep: string | null }

declare module 'claude-code' {
  interface PluginState {
    enrich: {
      /** the pass in flight */
      job: EnrichJob | null
      /** seconds the pass in flight has run, for the hint line */
      elapsed: number
      /** the applied result, until the person's first edit */
      result: EnrichResult | null
      binding: EnrichBinding
    }
  }
}
