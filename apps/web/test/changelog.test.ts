import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseChangelog, sectionSlug } from '../app/utils/changelog'

const SAMPLE = `# Changelog

## [1.2.0](https://github.com/o/r/compare/v1.1.0...v1.2.0) (2026-11-19)


### Features

* **web:** add the page \`/x\` ([d733659](https://github.com/o/r/commit/d73365971f219679d06baedf5fc33ac9a8321d19))
* a line without scope ([abc1234](https://github.com/o/r/commit/abc1234), closes [#12](https://github.com/o/r/issues/12))


### Bug Fixes

* **sync:** keep [links](https://example.org) readable ([ef2c69f](https://github.com/o/r/commit/ef2c69f89e18324f3e5c9eed303deac2cf723eca))

### Refactoring

### ⚠ BREAKING CHANGES

* **api:** drop the old route ([1234567](https://github.com/o/r/commit/1234567))

## 1.1.0 (2026-11-01)

### Features

* **web:** older ([aaaaaaa](https://github.com/o/r/commit/aaaaaaa))
`

describe('parseChangelog', () => {
  it('reads versions, dates, sections and items, newest first', () => {
    const [latest, older] = parseChangelog(SAMPLE)
    expect(latest).toMatchObject({ version: '1.2.0', date: '2026-11-19' })
    expect(latest!.sections.map((s) => s.title)).toEqual(['Features', 'Bug Fixes', 'BREAKING CHANGES'])
    expect(latest!.sections[0]!.items).toEqual([
      { scope: 'web', text: 'add the page /x' },
      { scope: null, text: 'a line without scope' },
    ])
    expect(older).toMatchObject({ version: '1.1.0', date: '2026-11-01' })
  })

  it('drops commit links and references, keeps the label of other links', () => {
    expect(parseChangelog(SAMPLE)[0]!.sections[1]!.items[0]!.text).toBe('keep links readable')
  })

  it('drops a section without items and keeps at most `limit` releases', () => {
    expect(parseChangelog(SAMPLE)[0]!.sections.map((s) => s.title)).not.toContain('Refactoring')
    expect(parseChangelog(SAMPLE, 1)).toHaveLength(1)
  })

  it('gives an empty list for text that is not a changelog', () => {
    expect(parseChangelog('')).toEqual([])
    expect(parseChangelog('<script>alert(1)</script>\n* nothing')).toEqual([])
  })

  it('parses the real CHANGELOG.md: semver versions, ISO dates, no markup or commit hash left in the text', () => {
    const releases = parseChangelog(readFileSync(new URL('../../../CHANGELOG.md', import.meta.url), 'utf8'), 1000)
    expect(releases.length).toBeGreaterThan(10)
    for (const r of releases) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      for (const item of r.sections.flatMap((s) => s.items)) {
        expect(item.text, item.text).not.toMatch(/\]\(|\([0-9a-f]{7,40}\)$|`/)
        expect(item.text.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('sectionSlug', () => {
  it('maps the release-please sections and leaves an unknown one to the page', () => {
    expect(['Features', 'Bug Fixes', 'Performance', 'Refactoring', 'BREAKING CHANGES'].map(sectionSlug)).toEqual(['features', 'fixes', 'perf', 'refactor', 'breaking'])
    expect(sectionSlug('Something else')).toBeNull()
  })
})
