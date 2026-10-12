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
}

/** The result a pass put in the prompt box, held until the person's first edit. */
export type EnrichResult = {
  pass: EnrichPass
  /** the draft it replaced */
  original: string
  /** the box's text after the fill, as the engine reported it */
  text: string
  model: string
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
