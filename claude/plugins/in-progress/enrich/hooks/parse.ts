const OPEN = '<prompt>'
const CLOSE = '</prompt>'

/**
 * The improved prompt out of a model's reply (PRD A.5): the text between the
 * first `<prompt>` and the last `</prompt>`, the rest when the closing tag is
 * missing, or the reply itself (unfenced) when it has no tag. '' when empty.
 */
export function parseReply(reply: string): string {
  const text = reply.replace(/\r\n?/g, '\n')
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
