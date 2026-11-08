import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { anchorProblems, hashProblems, pictureProblems, testidPatterns, textProblems } from '../check.mjs'
// @ts-expect-error plain ESM script without types
import { guideInfo } from '../guide.mjs'
// @ts-expect-error TypeScript source shared with the tour
import { CHAPTERS } from '../../../tests/docs/manifest'

type Step = { id: string; anchors: string[]; ops: object[]; shoot?: string; caption: Record<string, string> }
type Chapter = { id: string; title: Record<string, string>; intro: Record<string, string>; steps: Step[] }
const chapters = CHAPTERS as Chapter[]
const step = (id: string, anchors: string[], ops: object[] = []): Step => ({ id, anchors, ops, caption: { fr: 'a', en: 'b' } })
const one = (steps: Step[]): Chapter[] => [{ id: 'c', title: { fr: 'a', en: 'b' }, intro: { fr: 'a', en: 'b' }, steps }]

describe('the guide hashes', () => {
  const sources = { 'fr/c': 'x', 'en/c': 'y' }

  it('pass when the recorded manifest and sources are the current ones', () => {
    expect(hashProblems(guideInfo(sources, chapters), sources, chapters)).toEqual([])
  })

  it('name the command to run when the manifest changed', () => {
    const recorded = guideInfo(sources, chapters)
    const changed = chapters.map((c, i) => (i === 0 ? { ...c, steps: [{ ...c.steps[0], id: 'renamed' }, ...c.steps.slice(1)] } : c))
    const problems = hashProblems(recorded, sources, changed) as string[]
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('manifest changed')
    expect(problems[0]).toContain('pnpm docs:tour && pnpm docs:guide')
  })

  it('name the sources when a text changed, and say when the guide was never generated', () => {
    expect((hashProblems(guideInfo(sources, chapters), { ...sources, 'en/c': 'edited' }, chapters) as string[])[0]).toContain('docs/user-guide changed')
    expect((hashProblems(null, sources, chapters) as string[])[0]).toContain('guide.json is missing')
  })
})

describe('the guide texts', () => {
  const ok = { 'fr/c': '## a\nTexte.', 'en/c': '## a\nText.' }

  it('pass when every step has its text in both languages', () => {
    expect(textProblems(ok, one([step('a', ['x'])]))).toEqual([])
  })

  it('name the step and the language of a missing section', () => {
    expect(textProblems({ ...ok, 'en/c': '## other\nText.' }, one([step('a', ['x'])]))).toEqual([
      'c/a: no en text (add "## a" to docs/user-guide/en/c.md)',
      'c/other: the en text names a step that is not in the manifest',
    ])
  })

  it('name a chapter without a file, and treat an empty section as missing', () => {
    expect(textProblems({ 'fr/c': '## a\nT.' }, one([step('a', ['x'])]))).toEqual(['c: no en text (docs/user-guide/en/c.md)'])
    expect(textProblems({ 'fr/c': '## a\nT.', 'en/c': '## a\n' }, one([step('a', ['x'])]))).toEqual(['c/a: no en text (add "## a" to docs/user-guide/en/c.md)'])
  })
})

describe('the guide pictures', () => {
  it('pass when the four pictures of a step exist', () => {
    expect(pictureProblems(() => true, one([step('a', ['x'])]))).toEqual([])
  })

  it('name the step, the language and the variant of a missing picture', () => {
    const problems = pictureProblems((p: string) => !p.endsWith('/en/dark/c-a.webp'), one([step('a', ['x'])]), 'img') as string[]
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('c/a: no en dark picture (img/en/dark/c-a.webp)')
  })
})

describe('the anchors of the tour', () => {
  const app = [
    '<button data-testid="btn-share" />',
    '<li :data-testid="`theme-${t.id}`" />',
    '<div data-testid=\'chat-panel\' />',
    '<input data-testid="setup-title" />',
  ]
  const patterns = testidPatterns(app)

  it('finds static test ids and template ones (a wildcard for each interpolation)', () => {
    expect(anchorProblems(patterns, one([step('a', ['btn-share', 'theme-studio', 'chat-panel'], [{ click: 'btn-share' }, { fill: ['setup-title', 'x'] }])]))).toEqual([])
  })

  it('names the step and the anchor of a renamed control', () => {
    const renamed = testidPatterns(['<button data-testid="share-open" />'])
    expect(anchorProblems(renamed, one([step('a', ['btn-share'])]))).toEqual(['c/a: anchor btn-share not found in the app (a data-testid renamed or removed?)'])
  })

  it('checks the anchors a step clicks, fills and photographs, once each', () => {
    const none = testidPatterns([])
    const problems = anchorProblems(none, one([{ ...step('a', ['p'], [{ click: 'p' }, { fill: ['q', 'x'] }]), shoot: 'r' }])) as string[]
    expect(problems.map((p) => p.split(' ')[2]).sort()).toEqual(['p', 'q', 'r'])
  })

  it('does not let a literal test id match a longer name', () => {
    expect(anchorProblems(testidPatterns(['<a data-testid="btn" />']), one([step('a', ['btn-share'])]))).toHaveLength(1)
  })
})
