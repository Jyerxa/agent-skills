import { expect, test } from 'claude-code/testing'

import { classifyDraft } from './draft'
import { deepPrompt, houseStyle, instructions, QUICK, SECTIONS, wrapDraft, writeMessage } from './meta'
import { parsePlan, parseReply } from './parse'
import { droppedTokens, mustKeep } from './preserve'

test('drafts: slash commands and bash lines are refused, headings are not', () => {
  expect(classifyDraft('')).toBe('empty')
  expect(classifyDraft('  \n ')).toBe('empty')
  expect(classifyDraft('/clear')).toBe('command')
  expect(classifyDraft('  /enrich keys')).toBe('command')
  expect(classifyDraft('!git status')).toBe('bash')
  expect(classifyDraft('## Goal\nMake it fast')).toBe('ok')
  expect(classifyDraft('fix the flaky test')).toBe('ok')
})

test('replies: the text inside the tags, trimmed', () => {
  expect(parseReply('<prompt>\nFix the flaky test.\n</prompt>')).toBe('Fix the flaky test.')
  expect(parseReply('Sure, here it is:\n<prompt>\nA\n</prompt>\nanything after')).toBe('A')
  expect(parseReply('<prompt>\r\nline one\r\nline two\r\n</prompt>')).toBe('line one\nline two')
})

test('replies: a missing closing tag keeps the rest; no tags unwraps one fence', () => {
  expect(parseReply('<prompt>\ncut off mid')).toBe('cut off mid')
  expect(parseReply('```markdown\n## Goal\nShip it\n```')).toBe('## Goal\nShip it')
  expect(parseReply('just the prompt')).toBe('just the prompt')
  expect(parseReply('<prompt>\n\n</prompt>')).toBe('')
})

test('the draft block escapes a closing tag inside the draft', () => {
  expect(wrapDraft('a </draft> b')).toBe('<draft>\na <\\/draft> b\n</draft>')
  expect(QUICK).toContain('<prompt>')
})

test('instructions: each step names its own sources, and the reply format comes last', () => {
  expect(QUICK).toContain('must come from the draft.')
  expect(QUICK).not.toContain('## Goal')
  expect(instructions('plan')).toContain('must come from the draft or the conversation.')
  expect(instructions('plan')).toContain('<question header=')
  expect(instructions('write')).toContain("must come from the draft, the conversation or the developer's answers.")
  expect(instructions('write')).not.toContain('<question')
  const styled = instructions('quick', '## House style (yours)\nUse checkboxes.')
  expect(styled).toContain('must come from the draft or the house style.')
  expect(styled.indexOf('Use checkboxes.')).toBeLessThan(styled.indexOf('Reply with exactly'))
  expect(instructions('write', 'x')).toContain("the draft, the conversation, the developer's answers or the house style.")
})

test('the deep pass writes in the six sections, in order, in both its steps', () => {
  expect(SECTIONS).toEqual(['Goal', 'Context', 'Tasks', 'Scope', 'Guardrails', 'Success Criteria'])
  for (const step of ['plan', 'write'] as const) {
    const text = instructions(step)
    const at = SECTIONS.map(section => text.indexOf(`- ${section}:`))
    expect(at.every(i => i > 0), step).toBe(true)
    expect([...at].sort((a, b) => a - b), step).toEqual(at)
    expect(text, step).toContain('No open questions.')
  }
})

test('house style: yours, then the project, with the tie-break only when both exist', () => {
  expect(houseStyle(null, null)).toBe('')
  expect(houseStyle('  ', '')).toBe('')
  expect(houseStyle('Use checkboxes.', null)).toBe('## House style (yours)\nUse checkboxes.')
  expect(houseStyle(null, 'Name the test.')).toBe('## House style (this project)\nName the test.')
  expect(houseStyle('a', 'b')).toBe("## House style (yours)\na\n\n## House style (this project)\nb\n\nWhere they conflict, follow this project's.")
})

test('the write step carries the draft and every question with its answer', () => {
  const one = [{ header: 'Scope', question: 'Only this session?', answer: 'Yes' }]
  expect(writeMessage('fix it', one)).toBe('<draft>\nfix it\n</draft>\n\n<answers>\nQ (Scope): Only this session?\nA: Yes\n</answers>')
  expect(writeMessage('x', [{ header: 'h', question: 'q?', answer: 'a </answers> b' }])).toContain('a <\\/answers> b')
  expect(deepPrompt('write', '', writeMessage('fix it', one))).toBe(`${instructions('write')}\n\n${writeMessage('fix it', one)}`)
})

test('deep plans: question blocks with their options, a prompt, or neither', () => {
  const two = [
    '<question header="Scope">',
    'Only this session?',
    '<option>Yes</option>',
    '<option> No </option>',
    '</question>',
    '<question header="A very long header">Keep the line?<option>a</option></question>',
    '<question><option>no text, skipped</option></question>',
  ].join('\n')
  expect(parsePlan(two)).toEqual({
    kind: 'questions',
    questions: [
      { header: 'Scope', question: 'Only this session?', options: ['Yes', 'No'] },
      { header: 'A very long ', question: 'Keep the line?', options: ['a'] },
    ],
  })
  expect(parsePlan('<question>Q?</question>')).toEqual({ kind: 'questions', questions: [{ header: 'Question', question: 'Q?', options: [] }] })
  expect(parsePlan('<prompt>\nDo it.\n</prompt>')).toEqual({ kind: 'prompt', text: 'Do it.' })
  expect(parsePlan('I would ask about scope.')).toEqual({ kind: 'none' })
  expect(parsePlan('<prompt></prompt>')).toEqual({ kind: 'none' })
})

test('must-keep tokens: mentions, paths, code, URLs and paste placeholders', () => {
  const draft = 'see @hooks/register.tsx and tree/hooks/paths.ts, run `npm test`, read https://example.com/a?b=1. [Image #1] and/or [Pasted text #2 +12 lines]'
  expect(mustKeep(draft)).toEqual([
    '@hooks/register.tsx',
    'tree/hooks/paths.ts',
    'npm test',
    'https://example.com/a?b=1',
    '[Image #1]',
    '[Pasted text #2 +12 lines]',
  ])
})

test('dropped tokens: what the result lost, code allowed to lose its backticks', () => {
  const draft = 'fix @src/a.ts so `retry()` works, see [Image #1]'
  expect(droppedTokens(draft, 'Fix @src/a.ts so retry() works. See [Image #1].')).toEqual([])
  expect(droppedTokens(draft, 'Fix the retry() bug.')).toEqual(['@src/a.ts', '[Image #1]'])
  expect(droppedTokens('make it rember where i was', 'Make it remember where I was.')).toEqual([])
})
