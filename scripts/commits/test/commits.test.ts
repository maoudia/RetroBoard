import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { bumpFor, checkMessage, checkTrailers, MAX_HEADER } from '../lib.mjs'

describe('checkMessage', () => {
  it.each([
    'feat: add rings',
    'feat(web): hover peek into a cluster (300 ms, pointer devices only)',
    'fix(sync)!: drop protocol v1',
    'chore(main): release 1.2.0 (#112)',
    'docs(openspec): owner feedback wave',
    'test(e2e): workers configurable, default 2 (E2E_WORKERS)',
    'Merge pull request #5 from x/y',
    'Revert "feat: thing"',
    'fixup! feat: thing',
  ])('accepts %s', (m) => expect(checkMessage(m)).toEqual([]))

  it.each([
    ['', 'empty'],
    ['Update stuff', 'no type'],
    ['feature: add rings', 'unknown type'],
    ['Feat: add rings', 'uppercase type'],
    ['feat:no space', 'missing space'],
    ['feat(): empty scope', 'empty scope'],
    ['feat: ', 'empty subject'],
    ['feat: ends with a period.', 'period'],
  ])('rejects %j (%s)', (m) => expect(checkMessage(m).length).toBeGreaterThan(0))

  it('rejects a header over the limit', () => {
    expect(checkMessage(`feat: ${'x'.repeat(MAX_HEADER)}`)).toEqual([expect.stringContaining('limit')])
  })

  it('only reads the first line', () => {
    expect(checkMessage('feat: ok\n\nthis body is free text. Anything goes.')).toEqual([])
  })
})

describe('bumpFor', () => {
  it('maps commits to the SemVer level', () => {
    expect(bumpFor(['docs: x', 'chore: y'])).toBe('none')
    expect(bumpFor(['fix: a', 'perf: b'])).toBe('patch')
    expect(bumpFor(['fix: a', 'feat: b'])).toBe('minor')
    expect(bumpFor(['feat: a', 'fix(x)!: b'])).toBe('major')
    expect(bumpFor(['feat: a\n\nBREAKING CHANGE: the wire format changed'])).toBe('major')
  })
})

describe('checkTrailers', () => {
  it('refuses a human or agent co-author, in any case', () => {
    expect(checkTrailers('feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>')).toHaveLength(1)
    expect(checkTrailers('feat: x\n\nco-authored-by: Someone <a@b.c>')).toHaveLength(1)
  })

  it('allows the trailers GitHub adds for bots, and messages without any', () => {
    expect(checkTrailers('chore: x\n\nCo-authored-by: github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>')).toEqual([])
    expect(checkTrailers('feat: x\n\nbody mentions Co-Authored-By in the middle of a sentence')).toEqual([])
    expect(checkTrailers('feat: x')).toEqual([])
  })
})
