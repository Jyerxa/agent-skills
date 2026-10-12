import { expect, test } from 'claude-code/testing'

import { classifyDraft } from './draft'
import { QUICK, wrapDraft } from './meta'
import { parseReply } from './parse'
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
