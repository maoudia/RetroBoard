import { describe, expect, it } from 'vitest'
import { cloneSpec } from '../src'

const snap = {
  settings: { title: 'Sprint 12', themeId: 'halloween' },
  columns: [{ id: 'c1', title: 'Good', subtitle: 's', icon: 'smile', color: 2 }, { id: 'c2', title: 'Bad', subtitle: '', icon: 'frown', votable: false }],
  agenda: { phases: [{ id: 'p', kind: 'write', plannedMs: 300_000 }], rules: true, autoPublish: false, chain: true },
  actions: [
    { id: 'a1', text: 'Fix CI', owner: 'Ann', status: 'open', due: '2026-12-01' },
    { id: 'a2', text: 'Old', owner: 'Bob', status: 'done', due: null },
  ],
  notes: [{ id: 'n', text: 'secret idea' }],
} as never

describe('cloneSpec', () => {
  it('copies the structure of the board and never its content', () => {
    const c = cloneSpec(snap, 'board', 'copy')
    expect(c.title).toBe('Sprint 12 - copy')
    expect(c.themeId).toBe('halloween')
    expect(c.columns).toEqual([{ title: 'Good', subtitle: 's', icon: 'smile', color: 2 }, { title: 'Bad', subtitle: '', icon: 'frown', votable: false }])
    expect(c.agenda).toEqual({ phases: [{ kind: 'write', minutes: 5 }], rules: true, autoPublish: false, chain: true })
    expect(JSON.stringify(c)).not.toContain('secret idea')
    expect(c.actions).toBeUndefined()
  })
  it('copies only the open actions for an actions-only clone', () => {
    const c = cloneSpec(snap, 'actions', 'copy')
    expect(c.actions).toEqual([{ text: 'Fix CI', owner: 'Ann', status: 'open', due: '2026-12-01', from: 'Sprint 12' }])
    expect(c.columns).toBeUndefined()
  })
})
