import { expect, test } from 'claude-code/testing'

import type { FoldAnim as Anim } from '../types'
import { durationOf, FLASH_MS, flashLevel, isDone, rowPhase, stepFor } from './anim'

const unfold: Anim = { kind: 'unfold', path: 'src', startedAt: 0, count: 4, stepMs: 20 }
const fold: Anim = { kind: 'fold', path: 'src', startedAt: 0, count: 4, stepMs: 20 }

test('the step shrinks for big folders so the whole ripple stays under the cap', () => {
  expect(stepFor(1)).toBe(40)
  expect(stepFor(10)).toBe(40)
  expect(stepFor(20)).toBe(20)
  expect(stepFor(100)).toBe(12)
  expect(durationOf({ ...unfold, count: 100, stepMs: stepFor(100) })).toBeLessThanOrEqual(1224)
})

test('unfolding: rows arrive top down, dim first, then at full strength', () => {
  expect([0, 1, 2, 3].map(i => rowPhase(unfold, i, 0))).toEqual(['dim', 'hidden', 'hidden', 'hidden'])
  expect([0, 1, 2, 3].map(i => rowPhase(unfold, i, 25))).toEqual(['dim', 'dim', 'hidden', 'hidden'])
  expect([0, 1, 2, 3].map(i => rowPhase(unfold, i, 45))).toEqual(['shown', 'dim', 'dim', 'hidden'])
  expect([0, 1, 2, 3].map(i => rowPhase(unfold, i, 200))).toEqual(['shown', 'shown', 'shown', 'shown'])
  expect(isDone(unfold, 119)).toBe(false)
  expect(isDone(unfold, 120)).toBe(true)
})

test('folding: rows leave bottom up, dimming just before they go', () => {
  expect([0, 1, 2, 3].map(i => rowPhase(fold, i, 0))).toEqual(['shown', 'shown', 'dim', 'dim'])
  expect([0, 1, 2, 3].map(i => rowPhase(fold, i, 20))).toEqual(['shown', 'dim', 'dim', 'hidden'])
  expect([0, 1, 2, 3].map(i => rowPhase(fold, i, 60))).toEqual(['dim', 'hidden', 'hidden', 'hidden'])
  expect([0, 1, 2, 3].map(i => rowPhase(fold, i, 80))).toEqual(['hidden', 'hidden', 'hidden', 'hidden'])
  expect(isDone(fold, 79)).toBe(false)
  expect(isDone(fold, 80)).toBe(true)
})

test('a flash is lit at the press and fades out by FLASH_MS', () => {
  const flash: Anim = { kind: 'flash', path: 'src', startedAt: 0, count: 0, stepMs: 0 }
  expect(flashLevel(0)).toBe(1)
  expect(flashLevel(FLASH_MS / 2)).toBe(0.5)
  expect(flashLevel(FLASH_MS)).toBe(0)
  expect(isDone(flash, FLASH_MS - 1)).toBe(false)
  expect(isDone(flash, FLASH_MS)).toBe(true)
})
