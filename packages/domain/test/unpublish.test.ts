import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { allowedInPhase, phaseAllows } from '@retroboard/domain'

/** note.unpublish (change note-edit-and-unpublish): folds like a delete, with its own refusals. */
type H = ReturnType<typeof harness>
const note = (h: H, text: string, who = alice) => {
  const out = h.run({ t: 'note.add', columnId: h.col(0), text }, who)
  if (!out.ok) throw new Error(out.error)
  return out.dirty.notes[0]!
}
const carol = { cid: 'carol-client-id-0003', name: 'Carol', showName: false }
const facilitator = { ...carol, moderator: true }
const settings = (h: H, patch: Record<string, unknown>) => h.run({ t: 'settings.update', ...patch } as never)

describe('note.unpublish', () => {
  it('lets the author take the idea off the board and reports it', () => {
    const h = harness()
    const id = note(h, 'Slow CI')
    const out = h.run({ t: 'note.unpublish', id })
    expect(out).toMatchObject({ ok: true, dirty: { notes: [id], groups: [], meta: false } })
    expect(h.state.notes).toEqual({})
  })

  it('lets a facilitator take any idea off the board, and refuses a stranger', () => {
    const h = harness()
    const id = note(h, 'Bob idea', bob)
    expect(h.run({ t: 'note.unpublish', id }, carol)).toEqual({ ok: false, error: 'forbidden' })
    expect(h.run({ t: 'note.unpublish', id }, alice)).toEqual({ ok: false, error: 'forbidden' })
    expect(h.state.notes[id]).toBeDefined()
    expect(h.run({ t: 'note.unpublish', id }, facilitator).ok).toBe(true)
    expect(h.state.notes[id]).toBeUndefined()
  })

  it('refuses an unknown idea', () => {
    const h = harness()
    expect(h.run({ t: 'note.unpublish', id: 'ghost-note' })).toEqual({ ok: false, error: 'not-found' })
  })

  it('refuses a locked board, facilitators included, before it looks at the idea', () => {
    const h = harness()
    const id = note(h, 'x')
    settings(h, { locked: true })
    expect(h.run({ t: 'note.unpublish', id })).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'note.unpublish', id }, facilitator)).toEqual({ ok: false, error: 'locked' })
    expect(h.run({ t: 'note.unpublish', id: 'ghost-note' })).toEqual({ ok: false, error: 'locked' })
    expect(h.state.notes[id]).toBeDefined()
  })

  it('checks the idea exists before the rights', () => {
    const h = harness()
    expect(h.run({ t: 'note.unpublish', id: 'ghost-note' }, carol)).toEqual({ ok: false, error: 'not-found' })
  })

  it('refuses a frozen idea, and an idea in a frozen cluster, for its author and a facilitator', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    h.run({ t: 'note.freeze', id: a }, facilitator)
    expect(h.run({ t: 'note.unpublish', id: a })).toEqual({ ok: false, error: 'frozen' })
    expect(h.run({ t: 'note.unpublish', id: a }, facilitator)).toEqual({ ok: false, error: 'frozen' })
    h.run({ t: 'note.unfreeze', id: a }, facilitator)
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    h.state.groups[gid]!.frozen = true
    expect(h.run({ t: 'note.unpublish', id: b })).toEqual({ ok: false, error: 'frozen' })
  })

  it('removes the votes with the idea and dissolves a cluster left with one idea', () => {
    const h = harness()
    const a = note(h, 'a')
    const b = note(h, 'b')
    h.run({ t: 'note.group', id: a, ontoId: b })
    const gid = h.state.notes[a]!.groupId!
    h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
    h.run({ t: 'vote.add', kind: 'cluster', id: gid }, bob)
    const out = h.run({ t: 'note.unpublish', id: a })
    expect(out).toMatchObject({ ok: true, dirty: { notes: expect.arrayContaining([a, b]), groups: [gid] } })
    expect(h.state.notes[a]).toBeUndefined()
    expect(h.state.groups[gid]).toBeUndefined()
    expect(h.state.notes[b]!.groupId).toBeNull()
  })

  it('keeps a cluster that still has two ideas', () => {
    const h = harness()
    const [a, b, c] = [note(h, 'a'), note(h, 'b'), note(h, 'c')] as [string, string, string]
    h.run({ t: 'note.group', id: a, ontoId: b })
    h.run({ t: 'note.group', id: c, ontoId: b })
    expect(h.run({ t: 'note.unpublish', id: a }).ok).toBe(true)
    expect(Object.keys(h.state.groups)).toHaveLength(1)
    expect(h.state.notes[b]!.groupId).not.toBeNull()
  })

  describe('once voting is closed', () => {
    it('refuses an idea with votes, with votes on its cluster, and lets an unvoted one go', () => {
      const h = harness()
      const [a, b, c] = [note(h, 'a'), note(h, 'b'), note(h, 'c')] as [string, string, string]
      h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
      h.run({ t: 'note.group', id: b, ontoId: c })
      const gid = h.state.notes[b]!.groupId!
      h.run({ t: 'vote.add', kind: 'cluster', id: gid }, bob)
      const d = note(h, 'd')
      h.run({ t: 'vote.close' }, facilitator)
      expect(h.run({ t: 'note.unpublish', id: a })).toEqual({ ok: false, error: 'voting-closed' })
      expect(h.run({ t: 'note.unpublish', id: a }, facilitator)).toEqual({ ok: false, error: 'voting-closed' })
      expect(h.run({ t: 'note.unpublish', id: b })).toEqual({ ok: false, error: 'voting-closed' })
      expect(h.run({ t: 'note.unpublish', id: d }).ok).toBe(true)
    })

    it('still lets a voted idea go while voting is open', () => {
      const h = harness()
      const a = note(h, 'a')
      h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
      expect(h.run({ t: 'note.unpublish', id: a }).ok).toBe(true)
    })

    it('checks the rights before the vote', () => {
      const h = harness()
      const a = note(h, 'a')
      h.run({ t: 'vote.add', kind: 'note', id: a }, bob)
      h.run({ t: 'vote.close' }, facilitator)
      expect(h.run({ t: 'note.unpublish', id: a }, carol)).toEqual({ ok: false, error: 'forbidden' })
    })
  })

  it('is a write-phase command for participants', () => {
    expect(phaseAllows('write', 'note.unpublish')).toBe(true)
    expect(phaseAllows('group', 'note.unpublish')).toBe(false)
    expect(allowedInPhase(null, 'note.unpublish')).toBe(true)
  })
})
