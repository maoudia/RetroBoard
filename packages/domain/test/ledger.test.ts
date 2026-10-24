import { describe, expect, it } from 'vitest'
import { canSteer, type Command, emptyLedger, type EventBody, foldAll, foldEvent, isPrivileged, type Ledger, roleOf, type VerifiedEvent } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const key = (c: string) => c.repeat(42) + 'A'
const FAC = key('f'); const ALICE = key('a'); const BOB = key('b'); const CO = key('c')

let seq = 0
const ev = (author: string, body: EventBody): VerifiedEvent => ({ id: `01J${String(++seq).padStart(23, '0')}`, at: 1_000 + seq, author, body })
const cmd = (author: string, c: Command): VerifiedEvent => ev(author, { t: 'cmd', cmd: c, name: null, showName: false })
const genesis = (author = FAC, facilitatorKey = FAC, room = roomId) => ev(author, { t: 'genesis', roomId: room, facilitatorKey })
const started = (): Ledger => foldAll(emptyLedger(roomId), [genesis()])

describe('genesis', () => {
  it('is the root of trust', () => {
    const l = started()
    expect(l.facilitatorKey).toBe(FAC)
    expect(l.facilitators).toEqual([FAC])
  })

  it.each([
    ['signed by another key', () => genesis(ALICE, FAC)],
    ['for another room', () => genesis(FAC, FAC, 'Zz3dEfGhIjKlMnOpQrStUv')],
    ['with a malformed key', () => genesis('short', 'short')],
  ])('rejects a genesis %s', (_, make) => {
    expect(foldEvent(emptyLedger(roomId), make())).toMatchObject({ ok: false, reason: 'bad-genesis' })
  })

  it('ignores everything before the genesis and any second genesis', () => {
    const before = foldEvent(emptyLedger(roomId), cmd(ALICE, { t: 'note.add', columnId: 'x', text: 'hi' }))
    expect(before).toMatchObject({ ok: false, reason: 'no-genesis' })
    expect(foldEvent(started(), genesis(ALICE, ALICE))).toMatchObject({ ok: false, reason: 'duplicate-genesis' })
  })
})

describe('facilitator capability', () => {
  it('ignores a forged privileged event from a participant', () => {
    const l = started()
    const forged = foldEvent(l, cmd(ALICE, { t: 'settings.update', locked: true }))
    expect(forged).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(forged.ledger.board.settings.locked).toBe(false)
    expect(foldEvent(l, cmd(ALICE, { t: 'timer.start' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, cmd(ALICE, { t: 'board.reset' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('accepts privileged events from the facilitator', () => {
    const l = foldAll(started(), [cmd(FAC, { t: 'settings.update', locked: true })])
    expect(l.board.settings.locked).toBe(true)
  })

  it('lets participants contribute content', () => {
    const l = started()
    const col = l.board.columns[0]!.id
    const out = foldEvent(l, cmd(ALICE, { t: 'note.add', columnId: col, text: 'Deploys are slow' }))
    expect(out.ok).toBe(true)
    expect(Object.values(out.ledger.board.notes).map((n) => [n.text, n.ownerCid])).toEqual([['Deploys are slow', ALICE]])
  })

  it('delegation grants and revocation removes the capability; the root cannot be revoked', () => {
    let l = foldAll(started(), [ev(ALICE, { t: 'role.delegate', key: CO })])
    expect(l.facilitators).toEqual([FAC])
    l = foldAll(l, [ev(FAC, { t: 'role.delegate', key: CO }), ev(FAC, { t: 'role.delegate', key: CO })])
    expect(l.facilitators).toEqual([FAC, CO])
    l = foldAll(l, [cmd(CO, { t: 'settings.update', title: 'Sprint 43' })])
    expect(l.board.settings.title).toBe('Sprint 43')
    // A co-facilitator steers the board but cannot change roles; nobody revokes the root.
    expect(foldEvent(l, ev(CO, { t: 'role.revoke', key: FAC }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, ev(FAC, { t: 'role.revoke', key: FAC }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(l, ev(FAC, { t: 'role.delegate', key: 'bad' }))).toMatchObject({ ok: false, reason: 'invalid' })
    l = foldAll(l, [ev(FAC, { t: 'role.revoke', key: CO }), cmd(CO, { t: 'settings.update', title: 'Hijack' })])
    expect(l.facilitators).toEqual([FAC])
    expect(l.board.settings.title).toBe('Sprint 43')
  })

  it('classifies privileged bodies', () => {
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'timer.reset' }, name: null, showName: false })).toBe(true)
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'vote.toggle', id: 'x' }, name: null, showName: false })).toBe(false)
  })
})

describe('authorship', () => {
  it('ignores edits and deletes of a note from another session key', () => {
    let l = started()
    const col = l.board.columns[0]!.id
    l = foldAll(l, [cmd(ALICE, { t: 'note.add', columnId: col, text: 'mine' })])
    const id = Object.keys(l.board.notes)[0]!
    expect(foldEvent(l, cmd(BOB, { t: 'note.edit', id, text: 'pwned' }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(l, cmd(BOB, { t: 'note.delete', id }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldAll(l, [cmd(ALICE, { t: 'note.edit', id, text: 'mine, edited' })]).board.notes[id]!.text).toBe('mine, edited')
  })
})

describe('determinism', () => {
  it('two replicas folding the same events reach the same state', () => {
    const base = started()
    const col = base.board.columns[0]!.id
    const events = [
      cmd(ALICE, { t: 'note.add', columnId: col, text: 'a' }),
      cmd(BOB, { t: 'settings.update', locked: true }),
      cmd(BOB, { t: 'note.add', columnId: col, text: 'b' }),
      cmd(FAC, { t: 'column.add', title: 'Extra' }),
    ]
    expect(foldAll(base, events)).toEqual(foldAll(base, events))
    expect(foldAll(base, events).applied).toBe(4)
  })
})

describe('rate limit in the fold', () => {
  it('ignores an author beyond the window budget, identically on every replica, and recovers later', async () => {
    const { LIMITS } = await import('../src')
    let l = started()
    const col = l.board.columns[0]!.id
    const burst = Array.from({ length: LIMITS.foldRateMax + 5 }, (_, i) =>
      ({ id: `01K${String(i).padStart(23, '0')}`, at: 5_000 + i, author: ALICE, body: { t: 'cmd', cmd: { t: 'vote.toggle', id: 'nope' }, name: null, showName: false } }) as VerifiedEvent)
    // Votes on a missing note fail anyway: use notes so accepted events change the board.
    const notes = burst.map((e, i) => ({ ...e, body: { t: 'cmd', cmd: { t: 'note.add', columnId: col, text: `n${i}` }, name: null, showName: false } }) as VerifiedEvent)
    l = foldAll(l, notes)
    expect(Object.keys(l.board.notes)).toHaveLength(LIMITS.foldRateMax)
    expect(foldEvent(l, cmd(BOB, { t: 'note.add', columnId: col, text: 'bob is fine' })).ok).toBe(true)
    const later = { ...notes[0]!, id: '01L00000000000000000000000', at: 5_000 + LIMITS.foldRateWindowMs + 100 }
    expect(foldEvent(l, later).ok).toBe(true)
  })
})

describe('facilitation roles', () => {
  it('hand-over makes the recipient facilitator and keeps the previous one as co-facilitator', () => {
    let l = foldAll(started(), [ev(FAC, { t: 'role.handover', key: BOB })])
    expect(roleOf(l, BOB)).toBe('facilitator')
    expect(roleOf(l, FAC)).toBe('co-facilitator')
    // The new facilitator manages roles; the facilitator cannot be revoked before handing over.
    l = foldAll(l, [ev(BOB, { t: 'role.delegate', key: ALICE })])
    expect(roleOf(l, ALICE)).toBe('co-facilitator')
    expect(foldEvent(l, ev(FAC, { t: 'role.revoke', key: BOB }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(l, ev(ALICE, { t: 'role.handover', key: ALICE }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('a forged grant from a participant is ignored', () => {
    expect(foldEvent(started(), ev(ALICE, { t: 'role.delegate', key: ALICE }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(started(), ev(ALICE, { t: 'role.handover', key: ALICE }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('open facilitation lets anyone run privileged commands, never role changes', () => {
    let l = foldAll(started(), [cmd(FAC, { t: 'settings.update', openFacilitation: true })])
    expect(canSteer(l, ALICE)).toBe(true)
    expect(roleOf(l, ALICE)).toBe('participant')
    l = foldAll(l, [cmd(ALICE, { t: 'timer.start' })])
    expect(l.board.timer.running).toBe(true)
    expect(foldEvent(l, ev(ALICE, { t: 'role.delegate', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('hiding a participant ignores their later events; earlier ones stay; facilitators cannot be hidden', () => {
    let l = started()
    const col = l.board.columns[0]!.id
    l = foldAll(l, [cmd(ALICE, { t: 'note.add', columnId: col, text: 'before' }), ev(FAC, { t: 'participant.hide', key: ALICE })])
    expect(foldEvent(l, cmd(ALICE, { t: 'note.add', columnId: col, text: 'after' }))).toMatchObject({ ok: false, reason: 'hidden' })
    expect(Object.values(l.board.notes).map((n) => n.text)).toEqual(['before'])
    expect(foldEvent(l, ev(FAC, { t: 'participant.hide', key: FAC }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(l, ev(FAC, { t: 'role.handover', key: ALICE }))).toMatchObject({ ok: false, reason: 'forbidden' })
    l = foldAll(l, [ev(FAC, { t: 'participant.unhide', key: ALICE }), cmd(ALICE, { t: 'note.add', columnId: col, text: 'back' })])
    expect(Object.values(l.board.notes).map((n) => n.text)).toEqual(['before', 'back'])
  })

  it('boards without a genesis (legacy) have no roles', () => {
    expect(roleOf(emptyLedger(roomId), ALICE)).toBe('facilitator')
  })
})
