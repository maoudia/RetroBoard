import { describe, expect, it } from 'vitest'
import { bypassesPhaseRules, canSteer, type Command, emptyLedger, type EventBody, foldAll, foldEvent, isPrivileged, type Ledger, roleOf, type VerifiedEvent } from '../src'

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

describe('voting phase is privileged', () => {
  it('only facilitators close or reopen voting', () => {
    const l = started()
    expect(foldEvent(l, cmd(ALICE, { t: 'vote.close' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    const closed = foldAll(l, [cmd(FAC, { t: 'vote.close' })])
    expect(closed.board.settings.votingClosed).toBe(true)
    expect(foldEvent(closed, cmd(ALICE, { t: 'vote.reopen' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })
})

describe('phase rules in the fold', () => {
  it('participants follow the phase, facilitators do not', () => {
    let l = foldAll(started(), [cmd(FAC, { t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 5 }] }), cmd(FAC, { t: 'agenda.start' })])
    const col = l.board.columns[0]!.id
    l = foldAll(l, [cmd(ALICE, { t: 'note.add', columnId: col, text: 'idea' })])
    const id = Object.keys(l.board.notes)[0]!
    expect(foldEvent(l, cmd(ALICE, { t: 'vote.add', kind: 'note', id }))).toMatchObject({ ok: false, reason: 'phase' })
    expect(foldEvent(l, cmd(ALICE, { t: 'agenda.next' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, cmd(FAC, { t: 'vote.add', kind: 'note', id })).ok).toBe(true)
    l = foldAll(l, [cmd(FAC, { t: 'agenda.next' })])
    expect(foldEvent(l, cmd(ALICE, { t: 'vote.add', kind: 'note', id })).ok).toBe(true)
    expect(foldEvent(l, cmd(ALICE, { t: 'note.add', columnId: col, text: 'late' }))).toMatchObject({ ok: false, reason: 'phase' })
  })
})

describe('board theme is imposed', () => {
  it('a participant cannot change the theme; the facilitator can', () => {
    const l = started()
    const forged = foldEvent(l, cmd(ALICE, { t: 'settings.update', themeId: 'halloween' }))
    expect(forged).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(forged.ledger.board.settings.themeId).toBe(l.board.settings.themeId)
    expect(foldAll(l, [cmd(FAC, { t: 'settings.update', themeId: 'halloween' })]).board.settings.themeId).toBe('halloween')
  })
})

describe('everyone facilitates (open boards)', () => {
  const openBoard = () => foldAll(started(), [cmd(FAC, { t: 'settings.update', openFacilitation: true })])
  const running = (l: Ledger) => foldAll(l, [
    cmd(FAC, { t: 'agenda.set', phases: [{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 3 }], rules: true }),
    cmd(FAC, { t: 'agenda.start' }),
  ])

  it('board.init carries the mode; a log without the flag keeps the stored value', () => {
    const base = started()
    const init = (extra: object) => foldAll(base, [cmd(FAC, { t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', ...extra } as Command)])
    expect(init({ openFacilitation: true }).board.settings.openFacilitation).toBe(true)
    expect(init({ openFacilitation: false }).board.settings.openFacilitation).toBe(false)
    expect(init({}).board.settings.openFacilitation).toBe(false)
  })

  it('participants steer (next phase) but phase rules still apply to them', () => {
    const l = running(openBoard())
    const col = l.board.columns[0]!.id
    expect(bypassesPhaseRules(l, ALICE)).toBe(false)
    expect(bypassesPhaseRules(l, FAC)).toBe(true)
    // Write phase: a participant writes, then moves everyone to the Vote phase.
    const written = foldAll(l, [cmd(ALICE, { t: 'note.add', columnId: col, text: 'idea' })])
    const voting = foldAll(written, [cmd(ALICE, { t: 'agenda.next' })])
    expect(voting.board.agenda!.current).toBe(1)
    // Vote phase: writing is closed for participants, still open to the facilitator.
    expect(foldEvent(voting, cmd(ALICE, { t: 'note.add', columnId: col, text: 'late' }))).toMatchObject({ ok: false, reason: 'phase' })
    expect(foldEvent(voting, cmd(FAC, { t: 'note.add', columnId: col, text: 'late' })).ok).toBe(true)
  })

  it('only the facilitator capability switches the mode, in both directions', () => {
    const open = openBoard()
    expect(foldEvent(open, cmd(ALICE, { t: 'settings.update', openFacilitation: false }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    const closed = foldAll(open, [cmd(FAC, { t: 'settings.update', openFacilitation: false })])
    expect(closed.board.settings.openFacilitation).toBe(false)
    expect(foldEvent(closed, cmd(ALICE, { t: 'settings.update', openFacilitation: true }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    // Other settings stay open to everyone on an open board.
    expect(foldEvent(open, cmd(ALICE, { t: 'settings.update', locked: true })).ok).toBe(true)
  })
})

describe('takeover with the facilitator link (role.claim)', () => {
  it('the last claim wins; every previous lead stays co-facilitator', () => {
    let l = foldAll(started(), [ev(FAC, { t: 'role.claim', key: ALICE })])
    expect(l.lead).toBe(ALICE)
    expect(roleOf(l, FAC)).toBe('co-facilitator')
    l = foldAll(l, [ev(FAC, { t: 'role.claim', key: BOB })])
    expect(l.lead).toBe(BOB)
    expect(roleOf(l, ALICE)).toBe('co-facilitator')
    expect(roleOf(l, BOB)).toBe('facilitator')
  })

  it('is replayed identically on every peer (same events, same lead)', () => {
    const events = [ev(FAC, { t: 'role.claim', key: ALICE }), ev(FAC, { t: 'role.claim', key: BOB }), ev(FAC, { t: 'role.claim', key: ALICE })]
    expect(foldAll(started(), events).lead).toBe(ALICE)
    expect(foldAll(started(), events).lead).toBe(foldAll(started(), events).lead)
  })

  it('only the capability key may claim: not a lead, a co-facilitator or a participant', () => {
    const l = foldAll(started(), [ev(FAC, { t: 'role.claim', key: ALICE }), ev(ALICE, { t: 'role.delegate', key: CO })])
    expect(foldEvent(l, ev(ALICE, { t: 'role.claim', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, ev(CO, { t: 'role.claim', key: CO }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, ev(BOB, { t: 'role.claim', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('ignores a claim for a hidden participant or a malformed key', () => {
    const hidden = foldAll(started(), [ev(FAC, { t: 'participant.hide', key: ALICE })])
    expect(foldEvent(hidden, ev(FAC, { t: 'role.claim', key: ALICE }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(started(), ev(FAC, { t: 'role.claim', key: 'short' }))).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('board.destroy', () => {
  const withNote = () => {
    const l0 = started()
    const col = l0.board.columns[0]!.id
    return { col, l: foldAll(l0, [cmd(ALICE, { t: 'note.add', columnId: col, text: 'idée' })]) }
  }
  it('wipes the board and ignores every later event from anyone, even the facilitator', () => {
    const { col, l } = withNote()
    expect(Object.keys(l.board.notes)).toHaveLength(1)
    const closed = foldEvent(l, cmd(FAC, { t: 'board.destroy' }))
    expect(closed.ok).toBe(true)
    expect(Object.keys(closed.ledger.board.notes)).toHaveLength(0)
    expect(closed.ledger.board.settings.destroyed).toBe(true)
    for (const e of [cmd(ALICE, { t: 'note.add', columnId: col, text: 'trop tard' }), cmd(FAC, { t: 'settings.update', locked: false }), ev(FAC, { t: 'role.delegate', key: BOB })]) {
      expect(foldEvent(closed.ledger, e)).toMatchObject({ ok: false, reason: 'closed' })
    }
  })
  it('is refused from a participant, even on a board where everyone facilitates', () => {
    const open = foldAll(withNote().l, [cmd(FAC, { t: 'settings.update', openFacilitation: true })])
    expect(open.board.settings.openFacilitation).toBe(true)
    expect(foldEvent(open, cmd(ALICE, { t: 'board.destroy' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })
  it('a stale peer replaying older events cannot reopen the board', () => {
    const { col, l } = withNote()
    const closed = foldEvent(l, cmd(FAC, { t: 'board.destroy' })).ledger
    const replay = foldAll(closed, [cmd(BOB, { t: 'note.add', columnId: col, text: 'rejoué' })])
    expect(Object.keys(replay.board.notes)).toHaveLength(0)
    expect(replay.board.settings.destroyed).toBe(true)
  })
})

describe('reset and previous-phase commands are privileged', () => {
  it.each([{ t: 'column.reset', id: 'x' }, { t: 'vote.reset' }, { t: 'agenda.prev' }, { t: 'board.destroy' }] as Command[])('%j needs the facilitator', (c) => {
    expect(isPrivileged({ t: 'cmd', cmd: c, name: null, showName: false })).toBe(true)
  })
})
