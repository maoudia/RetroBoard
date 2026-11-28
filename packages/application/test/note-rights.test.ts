import { describe, expect, it } from 'vitest'
import { editRights, unpublishNeedsConfirm, unpublishRights, unpublishVotes } from '../src'

const ctx = { moderator: false, locked: false, votingClosed: false, unpublishKnown: true }
const mine = { mine: true }
const theirs = { mine: false }

describe('editRights', () => {
  it('is offered to the author and to a facilitator, not to someone else', () => {
    expect(editRights(mine, ctx)).toEqual({ shown: true, reason: null })
    expect(editRights(theirs, ctx)).toEqual({ shown: false, reason: null })
    expect(editRights(theirs, { ...ctx, moderator: true })).toEqual({ shown: true, reason: null })
  })
  it('is disabled for a frozen idea, with the reason, for everyone', () => {
    expect(editRights({ mine: true, frozen: true }, ctx)).toEqual({ shown: true, reason: 'frozen' })
    expect(editRights({ mine: false, frozen: true }, { ...ctx, moderator: true })).toEqual({ shown: true, reason: 'frozen' })
  })
  it('is disabled on a locked board except for a facilitator', () => {
    expect(editRights(mine, { ...ctx, locked: true })).toEqual({ shown: true, reason: 'locked' })
    expect(editRights(theirs, { ...ctx, locked: true, moderator: true })).toEqual({ shown: true, reason: null })
  })
  it('says frozen before locked', () => {
    expect(editRights({ mine: true, frozen: true }, { ...ctx, locked: true }).reason).toBe('frozen')
  })
})

describe('unpublishRights', () => {
  it('is offered to the author and to a facilitator, not to someone else', () => {
    expect(unpublishRights(mine, ctx, 0)).toEqual({ shown: true, reason: null })
    expect(unpublishRights(theirs, ctx, 0)).toEqual({ shown: false, reason: null })
    expect(unpublishRights(theirs, { ...ctx, moderator: true }, 0)).toEqual({ shown: true, reason: null })
  })
  it('is hidden while a person present does not know the command', () => {
    expect(unpublishRights(mine, { ...ctx, unpublishKnown: false }, 0).shown).toBe(false)
    expect(unpublishRights(theirs, { ...ctx, moderator: true, unpublishKnown: false }, 0).shown).toBe(false)
  })
  it('is disabled for a frozen idea, on a locked board (facilitators too), and for a voted idea once voting is closed', () => {
    expect(unpublishRights({ mine: true, frozen: true }, ctx, 0).reason).toBe('frozen')
    expect(unpublishRights(mine, { ...ctx, locked: true }, 0).reason).toBe('locked')
    expect(unpublishRights(theirs, { ...ctx, locked: true, moderator: true }, 0).reason).toBe('locked')
    expect(unpublishRights(mine, { ...ctx, votingClosed: true }, 2).reason).toBe('voting-closed')
  })
  it('lets an unvoted idea go once voting is closed, and a voted one while voting is open', () => {
    expect(unpublishRights(mine, { ...ctx, votingClosed: true }, 0).reason).toBeNull()
    expect(unpublishRights(mine, ctx, 3).reason).toBeNull()
  })
  it('says frozen, then locked, then voting closed', () => {
    const all = { ...ctx, locked: true, votingClosed: true }
    expect(unpublishRights({ mine: true, frozen: true }, all, 2).reason).toBe('frozen')
    expect(unpublishRights(mine, all, 2).reason).toBe('locked')
  })
})

describe('unpublishVotes', () => {
  const note = (id: string, groupId: string | null, votes: number | null) => ({ id, groupId, votes })
  it('counts the votes of a lone idea, none when hidden', () => {
    expect(unpublishVotes(note('a', null, 2), [note('a', null, 2)], [])).toEqual({ removed: 2, held: 2 })
    expect(unpublishVotes(note('a', null, null), [note('a', null, null)], [])).toEqual({ removed: 0, held: 0 })
  })
  it('adds the votes put on a cluster of two, which dissolves with the idea', () => {
    const notes = [note('a', 'g', 1), note('b', 'g', 0)]
    expect(unpublishVotes(notes[0]!, notes, [{ id: 'g', votes: 4 }])).toEqual({ removed: 4, held: 4 })
  })
  it('keeps the votes on a cluster that survives, but still counts them as held', () => {
    const notes = [note('a', 'g', 1), note('b', 'g', 0), note('c', 'g', 0)]
    expect(unpublishVotes(notes[0]!, notes, [{ id: 'g', votes: 4 }])).toEqual({ removed: 1, held: 4 })
  })
  it('ignores the clusters of the board when the idea is in none', () => {
    const lone = note('a', null, 2)
    expect(unpublishVotes(lone, [lone, note('b', 'g', 0), note('c', 'g', 0)], [{ id: 'g', votes: 9 }])).toEqual({ removed: 2, held: 2 })
  })
  it('only counts the ideas of the cluster, not the others of the board', () => {
    const notes = [note('a', 'g', 1), note('b', 'g', 0), note('x', null, 5), note('y', 'h', 7)]
    expect(unpublishVotes(notes[0]!, notes, [{ id: 'g', votes: 4 }, { id: 'h', votes: 7 }])).toEqual({ removed: 4, held: 4 })
  })
  it('never counts negative cluster votes and ignores an unknown cluster', () => {
    const notes = [note('a', 'g', 3), note('b', 'g', 3)]
    expect(unpublishVotes(notes[0]!, notes, [{ id: 'g', votes: 2 }])).toEqual({ removed: 3, held: 3 })
    expect(unpublishVotes(note('a', 'ghost', 1), notes, [{ id: 'g', votes: 2 }])).toEqual({ removed: 1, held: 1 })
    expect(unpublishVotes(notes[0]!, notes, [{ id: 'g', votes: null }])).toEqual({ removed: 3, held: 3 })
  })
})

describe('unpublishNeedsConfirm', () => {
  it('asks for votes, a pin, or someone else\'s idea; not for a plain idea of mine', () => {
    expect(unpublishNeedsConfirm({ mine: true }, 0)).toBe(false)
    expect(unpublishNeedsConfirm({ mine: true }, 1)).toBe(true)
    expect(unpublishNeedsConfirm({ mine: true, pinned: 'x' as never }, 0)).toBe(true)
    expect(unpublishNeedsConfirm({ mine: false }, 0)).toBe(true)
  })
})
