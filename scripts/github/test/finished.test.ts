import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { finishedTitles, groupsOf } from '../finished.mjs'

const put = (dir: string, rel: string, tasks: string) => {
  mkdirSync(join(dir, rel), { recursive: true })
  writeFileSync(join(dir, rel, 'tasks.md'), tasks)
}

describe('finished issues', () => {
  it('reads groups and ignores sections without tasks', () => {
    expect(groupsOf('# Tasks\n\n## 1. One\n- [x] a\n- [ ] b\n\n## Notes\n- [ ] not a group\n')).toEqual([{ n: '1', title: 'One', open: 1, done: 1 }])
  })

  it('lists a finished group of a running change, and the epic only when every group is finished', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fin-'))
    put(dir, 'half', '## 1. Done one\n- [x] a\n\n## 2. Open one\n- [ ] b\n')
    put(dir, 'all', '## 1. First\n- [x] a\n\n## 2. Second\n- [X] b\n')
    expect(finishedTitles(dir).sort()).toEqual(['[all] 1. First', '[all] 2. Second', '[epic] all', '[half] 1. Done one'])
  })

  it('treats an archived change as finished, whatever its boxes say', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fin-'))
    put(dir, 'archive/2026-11-05-shipped', '## 1. Ship\n- [x] a\n')
    expect(finishedTitles(dir).sort()).toEqual(['[epic] shipped', '[shipped] 1. Ship'])
  })
})
