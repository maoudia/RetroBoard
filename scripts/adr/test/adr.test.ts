import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { checkSet, newFileName, parseAdr, parseFrontMatter, renderIndex } from '../lib.mjs'

const good = (o: { status?: string; date?: string; chosen?: string; extra?: string; options?: string[] } = {}) => `---
status: ${o.status ?? 'accepted'}
date: ${o.date ?? '2026-10-25'}
decision-makers: Moncef Aoudia
---

# Use a thing

## Context and Problem Statement

Why.

## Considered Options

${(o.options ?? ['**Thing A** with details', 'Thing B']).map((x) => `* ${x}`).join('\n')}

## Decision Outcome

Chosen option: "${o.chosen ?? 'Thing A'}", because it works.
${o.extra ?? ''}`

describe('ADR parsing', () => {
  it('accepts a well-formed MADR file', () => {
    const a = parseAdr('0003-use-a-thing.md', good(), '2026-10-25')
    expect(a).toMatchObject({ number: 3, slug: 'use-a-thing', title: 'Use a thing', status: 'accepted', date: '2026-10-25', chosen: 'Thing A', superseded: null, errors: [] })
  })

  it('reads front matter with quotes and comments', () => {
    expect(parseFrontMatter('---\n# c\nstatus: "accepted"\ndate: \'2026-01-02\'\n---\nbody').meta).toEqual({ status: 'accepted', date: '2026-01-02' })
    expect(parseFrontMatter('no front matter').meta).toBeNull()
  })

  it('reports every structural problem', () => {
    const errs = (file: string, text: string) => parseAdr(file, text, '2026-10-25').errors
    expect(errs('3-thing.md', good())).toContain('file name must be NNNN-kebab-case-title.md')
    expect(errs('0003-Thing.md', good())).toContain('file name must be NNNN-kebab-case-title.md')
    expect(errs('0003-a.md', '# T')).toEqual(expect.arrayContaining(['missing front matter (status, date, decision-makers)', 'missing section "## Context and Problem Statement"']))
    expect(errs('0003-a.md', good({ status: 'done' }))[0]).toMatch(/status "done"/)
    expect(errs('0003-a.md', good({ date: '25/10/2026' }))[0]).toMatch(/must be YYYY-MM-DD/)
    expect(errs('0003-a.md', good({ date: '2026-12-01' }))).toContain('date 2026-12-01 is in the future')
    expect(errs('0003-a.md', good({ options: ['Only one'] , chosen: 'Only one' }))).toContain('list at least two considered options')
    expect(errs('0003-a.md', good({ chosen: 'Thing C' }))).toContain('chosen option "Thing C" is not in Considered Options')
    expect(errs('0003-a.md', good().replace('Chosen option: "Thing A", because', 'We pick A because'))[0]).toMatch(/must start with: Chosen option/)
    expect(errs('0003-a.md', good({ extra: '\n{fill this in}' }))).toContain('template placeholder "{...}" left in the text')
    // Braces inside inline code are fine.
    expect(errs('0003-a.md', good({ extra: '\n`{ ok: true }`' }))).toEqual([])
    expect(errs('0003-a.md', good().replace('decision-makers: Moncef Aoudia\n', ''))).toContain('decision-makers is required')
  })

  it('understands supersession', () => {
    expect(parseAdr('0001-a.md', good({ status: 'superseded by ADR-0004' })).superseded).toBe('0004')
  })
})

describe('ADR set', () => {
  const adr = (n: number, status = 'accepted') => parseAdr(`${String(n).padStart(4, '0')}-a${n}.md`, good({ status }), '2026-10-25')
  it('needs unique, gap-free numbers', () => {
    expect(checkSet([adr(0), adr(1)])).toEqual([])
    expect(checkSet([adr(0), adr(2)])).toEqual(['ADR-0001 is missing (numbers must not have gaps)'])
    expect(checkSet([adr(0), { ...adr(0), file: '0000-b.md' }])[0]).toMatch(/number 0 already used/)
  })

  it('checks supersession targets', () => {
    expect(checkSet([adr(0, 'superseded by ADR-0001'), adr(1)])).toEqual([])
    expect(checkSet([adr(0, 'superseded by ADR-0009')])[0]).toMatch(/does not exist/)
    expect(checkSet([adr(0, 'superseded by ADR-0000')])[0]).toMatch(/cannot supersede itself/)
    expect(checkSet([adr(0, 'superseded by ADR-0001'), adr(1, 'rejected')])[0]).toMatch(/which is rejected/)
  })

  it('renders the index with links and supersession', () => {
    const md = renderIndex([adr(1), adr(0, 'superseded by ADR-0001')])
    expect(md).toContain('| [0000](0000-a0.md) | Use a thing | superseded by [ADR-0001](0001-a1.md) | 2026-10-25 |')
    expect(md.indexOf('0000-a0')).toBeLessThan(md.indexOf('0001-a1'))
  })

  it('names new files', () => {
    expect(newFileName(21, 'Use Rolldown, not Webpack!')).toBe('0021-use-rolldown-not-webpack.md')
    expect(newFileName(3, 'Évite les accents')).toBe('0003-evite-les-accents.md')
    expect(newFileName(4, '!!!')).toBe('0004-decision.md')
  })
})
