// Reading and merging ~/.claude/keybindings.json (PRD F21). Pure: register.tsx does the file I/O.

export const SCHEMA = 'https://www.schemastore.org/claude-code-keybindings.json'
export const DOCS = 'https://code.claude.com/docs/en/keybindings'

/** The contexts whose bindings reach a Button's action from the prompt. */
const PROMPT_CONTEXTS = new Set(['Chat', 'Global'])

type Block = { context?: unknown; bindings?: unknown }
type File = { bindings: Block[] } & Record<string, unknown>

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseFile(text: string | null): File | { error: string } {
  if (text === null || text.trim() === '') return { $schema: SCHEMA, $docs: DOCS, bindings: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'keybindings.json is not plain JSON (comments or a trailing comma?)' }
  }
  if (!isRecord(parsed) || !Array.isArray(parsed['bindings'])) return { error: 'keybindings.json has no "bindings" array' }
  return parsed as File
}

/** The chord bound to `action` in the Chat or Global context, or null. */
export function chordFor(text: string | null, action: string): string | null {
  const file = parseFile(text)
  if ('error' in file) return null
  for (const block of file.bindings) {
    if (!isRecord(block) || !PROMPT_CONTEXTS.has(String(block['context'])) || !isRecord(block['bindings'])) continue
    for (const [chord, bound] of Object.entries(block['bindings'])) if (bound === action) return chord
  }
  return null
}

const MODIFIERS: Record<string, string> = {
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  opt: '⌥',
  option: '⌥',
  meta: '⌥',
  shift: '⇧',
  cmd: '⌘',
  command: '⌘',
  super: '⌘',
  win: '⌘',
}

/** `ctrl+x e` as the hint line shows it: `⌃x e`. */
export function labelChord(chord: string): string {
  return chord
    .trim()
    .split(/\s+/)
    .map(stroke => {
      const parts = stroke.split('+')
      const key = parts.pop() ?? ''
      return parts.map(m => MODIFIERS[m.toLowerCase()] ?? `${m}+`).join('') + key
    })
    .join(' ')
}

export type Wanted = { chord: string; action: string }
export type Merged = { text: string; added: string[]; already: string[]; conflicts: string[] }

/**
 * Adds each wanted chord to the Chat context, creating the file's skeleton
 * when there is none. An action already bound anywhere the prompt reaches is
 * left as it is; a chord bound to something else is refused and named.
 */
export function mergeBindings(text: string | null, wanted: readonly Wanted[]): Merged | { error: string } {
  const file = parseFile(text)
  if ('error' in file) return { error: String(file['error']) }
  const merged: Merged = { text: '', added: [], already: [], conflicts: [] }
  let chat = file.bindings.find(b => isRecord(b) && b.context === 'Chat' && isRecord(b.bindings))
  for (const { chord, action } of wanted) {
    const existing = chordFor(JSON.stringify(file), action)
    if (existing !== null) {
      merged.already.push(`${existing} → ${action}`)
      continue
    }
    const taken = chat && isRecord(chat.bindings) ? chat.bindings[chord] : undefined
    if (typeof taken === 'string' && taken !== action) {
      merged.conflicts.push(`${chord} is already bound to ${taken}`)
      continue
    }
    if (!chat) {
      chat = { context: 'Chat', bindings: {} }
      file.bindings.push(chat)
    }
    ;(chat.bindings as Record<string, unknown>)[chord] = action
    merged.added.push(`${chord} → ${action}`)
  }
  merged.text = `${JSON.stringify(file, null, 2)}\n`
  return merged
}
