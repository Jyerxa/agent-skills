/** The last rewrite, as `ctrl+x r` on the untouched result restores it. */
export type EnrichLast = { original: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    enrich: {
      /** true while the draft is out for a rewrite */
      busy: boolean
      /** where the shimmer's band of light is, one step per tick while busy */
      phase: number
    }
  }
}
