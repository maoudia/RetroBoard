import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { fieldsOf } from '../project-roadmap.mjs'

describe('project roadmap fields', () => {
  it('maps milestone, labels and state', () => {
    expect(fieldsOf({ state: 'open', milestone: { title: 'R1 Beta ready', due_on: '2026-11-08T00:00:00Z' }, labels: [{ name: 'epic' }, { name: 'lane:A' }] }))
      .toEqual({ release: 'R1 Beta ready', target: '2026-11-08', kind: 'Epic', lane: 'A', status: 'Todo' })
    expect(fieldsOf({ state: 'closed', milestone: { title: 'P1 Zero-storage core', due_on: null }, labels: ['task-group'] }))
      .toEqual({ release: null, target: null, kind: 'Task group', lane: null, status: 'Done' })
    expect(fieldsOf({ state: 'open', milestone: null, labels: [] }).release).toBeNull()
  })
})
