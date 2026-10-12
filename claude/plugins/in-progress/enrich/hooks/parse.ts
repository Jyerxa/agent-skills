const OPEN = '<prompt>'
const CLOSE = '</prompt>'
/** the dialog's chip holds 12 characters */
const HEADER_MAX = 12

const normalize = (reply: string) => reply.replace(/\r\n?/g, '\n')

/**
 * The improved prompt out of a model's reply (PRD A.5): the text between the
 * first `<prompt>` and the last `</prompt>`, the rest when the closing tag is
 * missing, or the reply itself (unfenced) when it has no tag. '' when empty.
 */
export function parseReply(reply: string): string {
  const text = normalize(reply)
  const open = text.indexOf(OPEN)
  if (open < 0) return unfence(text).trim()
  const close = text.lastIndexOf(CLOSE)
  return text.slice(open + OPEN.length, close > open ? close : undefined).trim()
}

/** A reply wrapped whole in one code fence, unwrapped. */
function unfence(text: string): string {
  const fenced = /^\s*```[\w-]*\n([\s\S]*?)\n```\s*$/.exec(text)
  return fenced?.[1] ?? text
}

/** One question the deep pass plans to ask. */
export type Question = { header: string; question: string; options: string[] }

/** The deep pass's plan: questions to ask, the prompt itself, or neither. */
export type Plan = { kind: 'questions'; questions: Question[] } | { kind: 'prompt'; text: string } | { kind: 'none' }

/**
 * A deep reply (PRD A.5): `<question>` blocks, each its text then its
 * `<option>`s, come first; else a tagged `<prompt>`. Deep is strict: a reply
 * with neither is `none`, so a question never lands in the box as a prompt.
 */
export function parsePlan(reply: string): Plan {
  const text = normalize(reply)
  const questions: Question[] = []
  for (const block of text.matchAll(/<question(?:\s+header="([^"]*)")?\s*>([\s\S]*?)<\/question>/g)) {
    const body = block[2] ?? ''
    const question = body.replace(/<option>[\s\S]*?<\/option>/g, '').trim()
    if (question === '') continue
    const options = [...body.matchAll(/<option>([\s\S]*?)<\/option>/g)].map(m => (m[1] ?? '').trim()).filter(o => o !== '')
    questions.push({ header: (block[1]?.trim() || 'Question').slice(0, HEADER_MAX), question, options })
  }
  if (questions.length > 0) return { kind: 'questions', questions }
  if (!text.includes(OPEN)) return { kind: 'none' }
  const prompt = parseReply(text)
  return prompt === '' ? { kind: 'none' } : { kind: 'prompt', text: prompt }
}
