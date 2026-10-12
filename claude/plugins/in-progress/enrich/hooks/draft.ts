/** What a draft in the prompt box is, as far as a pass cares. */
export type DraftKind = 'empty' | 'command' | 'bash' | 'ok'

/**
 * Slash commands and bash lines are left alone (PRD F4). A leading `#` is not
 * refused: a deep result starts with `## Goal`, and a pass on it must still run.
 */
export function classifyDraft(text: string): DraftKind {
  const head = text.trimStart()
  if (head === '') return 'empty'
  if (head.startsWith('/')) return 'command'
  if (head.startsWith('!')) return 'bash'
  return 'ok'
}
