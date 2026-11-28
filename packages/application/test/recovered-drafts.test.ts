import { describe, expect, it } from 'vitest'
import { type Command, emptyLedger, foldAll, type VerifiedEvent } from '@retroboard/domain'
import { everyoneKnowsUnpublish, recoveredDrafts, stackWithRecovered, unhandledDrafts } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const BOB = 'b'.repeat(42) + 'A'
const eid = (n: number) => `01J${String(n).padStart(23, '0')}`

function log() {
  const events: VerifiedEvent[] = [{ id: eid(1), at: 10, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }]
  const add = (cmd: Command, author = FAC, name: string | null = 'Alice', showName = true): string => {
    events.push({ id: eid(events.length + 1), at: 10 + events.length * 100, author, body: { t: 'cmd', cmd, name, showName } })
    return eid(events.length)
  }
  const board = () => foldAll(emptyLedger(roomId), events).board
  return { events, add, board }
}

/** A started board: Alice (facilitator) wrote "one", Bob wrote "bob idea" in the second column. */
function started() {
  const l = log()
  l.add({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
  const col = l.board().columns.map((c) => c.id)
  l.add({ t: 'note.add', columnId: col[0]!, text: 'one' })
  l.add({ t: 'note.add', columnId: col[1]!, text: 'bob idea' }, BOB, 'Bob', false)
  const ids = Object.fromEntries(Object.values(l.board().notes).map((n) => [n.text, n.id])) as Record<'one' | 'bob idea', string>
  return { ...l, col, ids }
}

describe('recoveredDrafts', () => {
  it('gives me back my own idea, with its column, text and colour, and no notice', () => {
    const l = started()
    const color = l.board().notes[l.ids.one]!.color
    const ev = l.add({ t: 'note.unpublish', id: l.ids.one })
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual([{ eventId: ev, columnId: l.col[0], text: 'one', color, by: null, byMe: true }])
  })

  it('gives Bob his idea back when the facilitator sent it back, naming the facilitator', () => {
    const l = started()
    const ev = l.add({ t: 'note.unpublish', id: l.ids['bob idea'] })
    expect(recoveredDrafts(roomId, l.events, BOB)).toMatchObject([{ eventId: ev, columnId: l.col[1], text: 'bob idea', by: 'Alice', byMe: false }])
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual([])
  })

  it('does not name a facilitator who hides their name', () => {
    const l = started()
    l.add({ t: 'note.unpublish', id: l.ids['bob idea'] }, FAC, 'Alice', false)
    l.add({ t: 'note.add', columnId: l.col[1]!, text: 'again' }, BOB, 'Bob', false)
    expect(recoveredDrafts(roomId, l.events, BOB)[0]).toMatchObject({ by: null, byMe: false })
  })

  it('does not name a facilitator who has no name', () => {
    const l = started()
    l.add({ t: 'note.unpublish', id: l.ids['bob idea'] }, FAC, null, true)
    expect(recoveredDrafts(roomId, l.events, BOB)[0]).toMatchObject({ by: null, byMe: false })
  })

  it('never adds another person\'s idea', () => {
    const l = started()
    l.add({ t: 'note.unpublish', id: l.ids['bob idea'] })
    l.add({ t: 'note.unpublish', id: l.ids.one })
    expect(recoveredDrafts(roomId, l.events, 'c'.repeat(42) + 'A')).toEqual([])
    expect(recoveredDrafts(roomId, l.events, BOB).map((d) => d.text)).toEqual(['bob idea'])
    expect(recoveredDrafts(roomId, l.events, FAC).map((d) => d.text)).toEqual(['one'])
  })

  it('ignores a refused unpublish (a stranger, a frozen idea, a locked board)', () => {
    const l = started()
    l.add({ t: 'note.unpublish', id: l.ids['bob idea'] }, 'c'.repeat(42) + 'A', 'Eve')
    l.add({ t: 'note.freeze', id: l.ids.one })
    l.add({ t: 'note.unpublish', id: l.ids.one })
    l.add({ t: 'note.unpublish', id: 'ghost-note' })
    expect(recoveredDrafts(roomId, l.events, BOB)).toEqual([])
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual([])
    l.add({ t: 'note.unfreeze', id: l.ids.one })
    l.add({ t: 'settings.update', locked: true })
    l.add({ t: 'note.unpublish', id: l.ids.one })
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual([])
  })

  it('does not take a plain delete for an unpublish', () => {
    const l = started()
    l.add({ t: 'note.delete', id: l.ids.one })
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual([])
  })

  it('replays to the same drafts with the same event ids, in order', () => {
    const l = started()
    l.add({ t: 'note.add', columnId: l.col[0]!, text: 'two' })
    const two = Object.values(l.board().notes).find((n) => n.text === 'two')!.id
    const a = l.add({ t: 'note.unpublish', id: l.ids.one })
    const b = l.add({ t: 'note.unpublish', id: two })
    const first = recoveredDrafts(roomId, l.events, FAC)
    expect(first.map((d) => d.eventId)).toEqual([a, b])
    expect(recoveredDrafts(roomId, l.events, FAC)).toEqual(first)
  })

  it('starts from the ledger of a snapshot, so only the events after it count (a late join)', () => {
    const l = started()
    l.add({ t: 'note.unpublish', id: l.ids.one })
    const cut = foldAll(emptyLedger(roomId), l.events)
    l.add({ t: 'note.unpublish', id: l.ids['bob idea'] })
    const late = recoveredDrafts(roomId, l.events.slice(l.events.length - 1), BOB, cut)
    expect(late.map((d) => d.text)).toEqual(['bob idea'])
    expect(recoveredDrafts(roomId, l.events.slice(l.events.length - 1), FAC, cut)).toEqual([])
  })
})

describe('unhandledDrafts', () => {
  const d = (eventId: string) => ({ eventId, columnId: 'c', text: eventId, color: 0, by: null, byMe: true })
  it('keeps the drafts whose event id was not handled yet, in order', () => {
    expect(unhandledDrafts([d('a'), d('b'), d('c')], new Set(['b'])).map((x) => x.eventId)).toEqual(['a', 'c'])
    expect(unhandledDrafts([d('a')], new Set())).toHaveLength(1)
    expect(unhandledDrafts([], new Set(['a']))).toEqual([])
  })
})

describe('everyoneKnowsUnpublish (rolling update gate)', () => {
  it('is true alone, and when every other person announces the command', () => {
    expect(everyoneKnowsUnpublish([])).toBe(true)
    expect(everyoneKnowsUnpublish([{ me: true }])).toBe(true)
    expect(everyoneKnowsUnpublish([{ me: true }, { me: false, unpublish: true }, { me: false, unpublish: true }])).toBe(true)
  })
  it('is false as soon as one person present does not announce it', () => {
    expect(everyoneKnowsUnpublish([{ me: true, unpublish: true }, { me: false }])).toBe(false)
    expect(everyoneKnowsUnpublish([{ me: true }, { me: false, unpublish: true }, { me: false }])).toBe(false)
  })
})

describe('stackWithRecovered', () => {
  const rec = (eventId: string, columnId = 'c1') => ({ eventId, columnId, text: `t-${eventId}`, color: 3, by: null, byMe: true })
  const mine = (id: string) => ({ id, columnId: 'c1', text: id, color: 0 })

  it('puts the recovered ideas on top of the stack, the newest first, each with an id of its event', () => {
    expect(stackWithRecovered([mine('a'), mine('b')], [rec('e1'), rec('e2')])).toEqual([
      { id: 'rec-e2', columnId: 'c1', text: 't-e2', color: 3 },
      { id: 'rec-e1', columnId: 'c1', text: 't-e1', color: 3 },
      mine('a'), mine('b'),
    ])
  })

  it('keeps the stack as it is when nothing was recovered', () => {
    expect(stackWithRecovered([mine('a')], [])).toEqual([mine('a')])
  })

  it('does not duplicate a draft another tab already recovered from the same event', () => {
    const once = stackWithRecovered([mine('a')], [rec('e1')])
    const twice = stackWithRecovered(once, [rec('e1')])
    expect(twice.filter((d) => d.id === 'rec-e1')).toHaveLength(1)
    expect(twice).toHaveLength(2)
  })
})
