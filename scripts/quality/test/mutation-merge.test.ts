import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { incomplete, indexHtml, mergeReports } from '../mutation-merge.mjs'

describe('mutation shards', () => {
  it('merges the files of every shard into the first report', () => {
    const merged = mergeReports([
      { schemaVersion: '2', thresholds: { high: 80 }, files: { 'packages/a/src/x.ts': { mutants: [] } } },
      { schemaVersion: '2', files: { 'packages/b/src/y.ts': { mutants: [{ status: 'Killed' }] } } },
    ])
    expect(Object.keys(merged.files)).toEqual(['packages/a/src/x.ts', 'packages/b/src/y.ts'])
    expect(merged.thresholds).toEqual({ high: 80 })
  })

  it('refuses to merge nothing: a missing shard must not pass as a full run', () => {
    expect(() => mergeReports([])).toThrow('no mutation report')
  })

  it('lists each package with its score and escapes its name', () => {
    const html = indexHtml([{ pkg: 'domain', detected: 99, undetected: 1 }, { pkg: 'a<b', detected: 0, undetected: 0 }])
    expect(html).toContain('<a href="domain/index.html">domain</a>: 99% (1 undetected of 100)')
    expect(html).toContain('a&lt;b')
    expect(html).toContain(': 100% (0 undetected of 0)')
  })

  it('calls a run partial when a shard is missing or a package has no file', () => {
    const report = { files: { 'packages/a/src/x.ts': {} } }
    expect(incomplete(2, 2, report, ['a'])).toEqual([])
    expect(incomplete(1, 2, report, ['a'])[0]).toContain('1 shard(s) found, 2 expected')
    expect(incomplete(2, 2, report, ['a', 'b'])).toEqual(['no file of packages/b in the report'])
  })
})
