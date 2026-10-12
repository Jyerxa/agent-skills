// The instructions each pass sends (PRD §4.5, §4.6, A.6).

/** The deep pass asks at most this many questions. */
export const MAX_QUESTIONS = 4

/** One question the deep pass asked, and the person's answer. */
export type Answered = { header: string; question: string; answer: string }

/**
 * Which instructions: the quick pass; the deep pass's first step, which plans
 * its questions (or writes at once when there is nothing to ask); and its
 * last step, which writes with the answers.
 */
export type Step = 'quick' | 'plan' | 'write'

/** The deep pass's sections, in order (PRD F19). */
export const SECTIONS = ['Goal', 'Context', 'Tasks', 'Scope', 'Guardrails', 'Success Criteria'] as const

const QUICK_HEAD = `You tidy a developer's draft prompt for Claude Code, an agentic coding assistant that will act on it in their repository. You never answer the draft or do the work it asks for; you return the draft, improved.

Make a light pass:
- Fix spelling and grammar, and anything that would mislead.
- Make the ask explicit: what to do, and to what.
- Several separate asks become a short list; otherwise keep prose. No headings.
- Keep hedges ("maybe", "not sure") as the author wrote them.
- Keep about the same length. A draft that is already clear comes back nearly unchanged.`

const DEEP_OPENING = `Stop: don't continue the conversation and don't call tools. The developer has drafted their next prompt for this session and wants it to be a good one before they send it. Never answer the draft or do the work it asks for.`

const PLAN_HEAD = `${DEEP_OPENING}

First find out what is missing. List the points the work depends on that are missing or ambiguous and that neither the conversation nor the draft settles: only those whose answer changes the work, most important first, at most ${MAX_QUESTIONS}. Each is one question with 2 or 3 short answers (1 to 5 words each), the most likely first; the developer can also type their own or leave it to Claude Code. The questions are asked one after another, so make each stand on its own.

If nothing is missing, don't ask: write the prompt straight away.`

const WRITE_HEAD = `${DEEP_OPENING}

You asked them about the draft, and their answers are below it. Now write the prompt.`

const WRITING = `How to write the prompt. Use these sections, in this order, each under a "## " heading, each a sentence or a few short bullets:
- Goal: the outcome wanted, in a sentence or two.
- Context: what Claude Code needs to know to do it well: files, code, earlier decisions. Use the conversation to resolve references ("the bug above", "that file") into concrete names.
- Tasks: the concrete changes to make, as a list.
- Scope: what is in, and what is out.
- Guardrails: constraints, and what must not change or break.
- Success Criteria: how to tell it is done, as checks that can be verified.
Leave a section out only when there is nothing true to put in it; never pad one. Build every answer in as a decision where it belongs; where the developer left something to Claude Code, leave it out. No open questions. Length: at most the larger of 800 characters and 3 times the draft.`

const PROMPT_FORMAT = `Reply with exactly this and nothing else:
<prompt>
the prompt
</prompt>`

const PLAN_FORMAT = `Reply in exactly one of these two forms and nothing else.
To ask, one block per question, most important first:
<question header="one or two words">
the question, ending in a question mark
<option>the most likely answer</option>
<option>another answer</option>
</question>
To write:
<prompt>
the prompt
</prompt>`

/** `a`, `a or b`, `a, b or c` */
const either = (items: string[]): string => (items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`)

const rules = (sources: string): string => `Never invent. Every requirement, constraint, file, name, number and technology must come from ${sources}.

Keep verbatim: @mentions, file paths, identifiers, inline code and code blocks, URLs, error messages, quoted text, and placeholders such as [Image #1] or [Pasted text #1 +12 lines].

Keep the author's voice: first person, their terms. No pleasantries and no commentary about the rewrite.`

/**
 * A step's instructions: what it does, how the deep pass writes, the shared
 * rules, the house style when there is one, then the reply format. The quick
 * pass sends them as a cached system prompt; the deep pass at the head of
 * each message to its fork.
 */
export function instructions(step: Step, style = ''): string {
  const sources = either([
    'the draft',
    ...(step === 'quick' ? [] : ['the conversation']),
    ...(step === 'write' ? ["the developer's answers"] : []),
    ...(style ? ['the house style'] : []),
  ])
  const parts =
    step === 'quick' ? [QUICK_HEAD] : step === 'plan' ? [PLAN_HEAD, WRITING] : [WRITE_HEAD, WRITING]
  return [...parts, rules(sources), style, step === 'plan' ? PLAN_FORMAT : PROMPT_FORMAT].filter(part => part !== '').join('\n\n')
}

/** The quick pass's system prompt with no house style. */
export const QUICK = instructions('quick')

/** The person's and the project's standing preferences (PRD F20); '' when neither has any. */
export function houseStyle(yours: string | null, project: string | null): string {
  const parts: string[] = []
  if (yours?.trim()) parts.push(`## House style (yours)\n${yours.trim()}`)
  if (project?.trim()) parts.push(`## House style (this project)\n${project.trim()}`)
  if (parts.length === 2) parts.push("Where they conflict, follow this project's.")
  return parts.join('\n\n')
}

/** Text the person typed, kept from closing the block it sits in. */
const escape = (text: string, tag: string) => text.replace(new RegExp(`</${tag}>`, 'gi'), `<\\/${tag}>`)

/** The draft as the model reads it. */
export const wrapDraft = (text: string): string => `<draft>\n${escape(text, 'draft')}\n</draft>`

/** The deep pass's last step: the draft, then the questions with the person's answers. */
export function writeMessage(draft: string, answered: readonly Answered[]): string {
  const turns = answered.map(a => `Q (${a.header}): ${a.question}\nA: ${a.answer}`).join('\n\n')
  return `${wrapDraft(draft)}\n\n<answers>\n${escape(turns, 'answers')}\n</answers>`
}

/** What the deep pass sends its fork at each step: the step's instructions, then its message. */
export const deepPrompt = (step: 'plan' | 'write', style: string, message: string): string => `${instructions(step, style)}\n\n${message}`
