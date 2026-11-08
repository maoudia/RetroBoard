import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { changeState, decide } from '../spec-gate.mjs'

const d = (title: string, body = '', labels = '') => decide({ title, body, labels }) as { need: string; change?: string; problem?: string }

describe('the spec gate', () => {
  it('requires a change for a feature, a fix, a performance change or a breaking change, and the no-spec label does not help', () => {
    for (const title of ['feat(web): a', 'fix(sync): b', 'perf: c', 'chore(main)!: d', 'refactor(domain)!: e']) {
      expect(d(title).problem, title).toContain('OpenSpec')
      expect(d(title, '', 'no-spec').problem, `${title} with the label`).toContain('OpenSpec')
    }
  })

  it('accepts a feature that names its change, whatever the label', () => {
    expect(d('feat(web): a', 'Why\n\nChange: user-manual-and-tutorials')).toEqual({ need: 'change', change: 'user-manual-and-tutorials' })
    expect(d('fix: b', 'Change:retro-report', 'no-spec').change).toBe('retro-report')
  })

  it('lets pull requests that change no behaviour use the no-spec label, and asks the others for a change or the label', () => {
    for (const title of ['docs: a', 'test(e2e): b', 'build(deps): c', 'ci(release): d', 'chore(openspec): e', 'style: f', 'refactor(web): g', 'revert: h']) {
      expect(d(title, '', 'no-spec'), title).toEqual({ need: 'optional' })
      expect(d(title).problem, `${title} without anything`).toContain('no-spec')
    }
  })

  it('treats the labelled dependency updates of Dependabot as exempt', () => {
    expect(d('build(deps): bump x', '', 'dependencies')).toEqual({ need: 'optional' })
    expect(d('chore(deps): bump y', '', 'github_actions')).toEqual({ need: 'optional' })
    expect(d('feat: z', '', 'dependencies').problem).toContain('OpenSpec')
  })

  it('finds a change open, archived, or not at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'changes-'))
    mkdirSync(join(root, 'open-one'))
    mkdirSync(join(root, 'archive', '2026-11-08-done-one'), { recursive: true })
    mkdirSync(join(root, 'archive', '2026-11-08-one-more'), { recursive: true })
    expect(changeState('open-one', root)).toBe('open')
    expect(changeState('done-one', root)).toBe('archived')
    expect(changeState('nope', root)).toBe('unknown')
    expect(changeState('one', root)).toBe('unknown')
  })
})
