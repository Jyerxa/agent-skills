// The verbatim check (PRD F12): tokens of the draft a result must keep.

const TRAILING = /[.,;:!?)\]'"]+$/

type Kind = { pattern: RegExp; trim: boolean; inner?: (token: string) => string }

const KINDS: Kind[] = [
  // paste placeholders: [Image #1], [Pasted text #2 +12 lines]
  { pattern: /\[(?:Image|Pasted text) #\d+[^\]\n]*\]/g, trim: false },
  { pattern: /https?:\/\/[^\s<>`]+/g, trim: true },
  // inline code: the code itself must survive; its backticks may not
  { pattern: /`[^`\n]+`/g, trim: false, inner: token => token.slice(1, -1) },
  { pattern: /(?<![\w`])@[^\s`]+/g, trim: true },
  // paths with a folder and an extension: hooks/register.tsx, ./a/b.md, ~/x/y.json
  { pattern: /(?<![\w@/:.`-])(?:~|\.{1,2})?\/?(?:[\w.-]+\/)+[\w-]+\.\w+/g, trim: true },
]

/** The tokens of `text` a rewrite must keep, in order of appearance, each once. */
export function mustKeep(text: string): string[] {
  const found: { at: number; token: string }[] = []
  for (const kind of KINDS) {
    for (const match of text.matchAll(kind.pattern)) {
      const token = kind.trim ? match[0].replace(TRAILING, '') : match[0]
      if (token.length > 1) found.push({ at: match.index ?? 0, token: kind.inner ? kind.inner(token) : token })
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map(f => f.token))]
}

/** The tokens of the draft the result lost. */
export function droppedTokens(draft: string, result: string): string[] {
  return mustKeep(draft).filter(token => !result.includes(token))
}
