import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { inProgress, verdict } from '../wip-check.mjs'

const change = (dir: string, name: string, tasks: string) => {
  mkdirSync(join(dir, name), { recursive: true })
  writeFileSync(join(dir, name, 'tasks.md'), tasks)
}

describe('work in progress ratchet', () => {
  it('counts only changes that are started and not finished', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wip-'))
    change(dir, 'not-started', '- [ ] a\n- [ ] b\n')
    change(dir, 'started', '- [x] a\n- [ ] b\n')
    change(dir, 'finished', '- [x] a\n- [X] b\n')
    change(dir, 'archive', '- [x] a\n- [ ] b\n')
    mkdirSync(join(dir, 'no-tasks'))
    expect(inProgress(dir)).toEqual(['started'])
  })

  it('fails above the ceiling, asks to lower it below, and is quiet at the target', () => {
    expect(verdict(5, { ceiling: 4, target: 3 })).toBe('fail')
    expect(verdict(4, { ceiling: 4, target: 3 })).toBe('ok')
    expect(verdict(2, { ceiling: 4, target: 3 })).toBe('lower')
    expect(verdict(2, { ceiling: 3, target: 3 })).toBe('ok')
  })
})
