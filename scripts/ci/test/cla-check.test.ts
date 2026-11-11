import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { decide, isSignature, message, SIGN_SENTENCE } from '../cla-check.mjs'

const d = (authors: (string | null)[], signatures: { name: string }[] = []) => decide({ authors, signatures }) as { missing: string[]; signed: string[] }

describe('the CLA check', () => {
  it('lets members and bots through without a signature', () => {
    expect(d(['aoudiamoncef', 'Claude', 'dependabot[bot]', 'release-please[bot]', 'github-actions[bot]', 'renovate[bot]']).missing).toEqual([])
  })

  it('asks an external contributor once, and not again after the signature (case-insensitive)', () => {
    expect(d(['alice', 'alice', 'aoudiamoncef']).missing).toEqual(['alice'])
    expect(d(['Alice'], [{ name: 'alice' }])).toEqual({ missing: [], signed: ['Alice'] })
  })

  it('waits for every unsigned author, and treats a commit without a GitHub login as unsigned', () => {
    expect(d(['alice', 'bob'], [{ name: 'alice' }]).missing).toEqual(['bob'])
    expect(d(['alice', null], [{ name: 'alice' }]).missing).toEqual(['unknown'])
  })

  it('does not allowlist a look-alike login', () => {
    expect(d(['aoudiamoncef-evil', 'claudette', 'my-dependabot']).missing).toEqual(['aoudiamoncef-evil', 'claudette', 'my-dependabot'])
  })

  it('accepts the signature sentence only, alone in the comment', () => {
    expect(isSignature(SIGN_SENTENCE)).toBe(true)
    expect(isSignature(`  ${SIGN_SENTENCE}\n`)).toBe(true)
    expect(isSignature(`${SIGN_SENTENCE}, maybe`)).toBe(false)
    expect(isSignature('recheck')).toBe(false)
    expect(message(['alice'])).toContain(`> ${SIGN_SENTENCE}`)
  })
})
