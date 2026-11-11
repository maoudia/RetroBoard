import { describe, expect, it } from 'vitest'
import { bypassesPhaseRules, canSteer, type Command, emptyLedger, type EventBody, foldAll, foldEvent, isPrivileged, LIMITS, type Ledger, PRIVILEGED_COMMANDS, roleOf, type VerifiedEvent } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const key = (c: string) => c.repeat(42) + 'A'
const FAC = key('f'); const ALICE = key('a'); const BOB = key('b'); const CO = key('c')

let seq = 0
const ev = (author: string, body: EventBody, at = 1_000 + ++seq, id = `01J${String(++seq).padStart(23, '0')}`): VerifiedEvent => ({ id, at, author, body })
const cmd = (author: string, c: Command, at?: number, id?: string) => ev(author, { t: 'cmd', cmd: c, name: null, showName: false }, at, id)
const genesis = (author = FAC) => ev(author, { t: 'genesis', roomId, facilitatorKey: author })
const started = (): Ledger => foldAll(emptyLedger(roomId), [genesis()])
const open = (): Ledger => foldAll(started(), [cmd(FAC, { t: 'settings.update', openFacilitation: true })])

const EXPECTED_PRIVILEGED = [
  'agenda.advance', 'agenda.clear', 'agenda.end', 'agenda.extend', 'agenda.next', 'agenda.options', 'agenda.pause', 'agenda.prev', 'agenda.restart', 'agenda.set', 'agenda.start', 'agenda.toClose', 'agenda.voteOpen',
  'action.import', 'board.destroy', 'board.init', 'board.reset', 'chat.clear', 'column.hide', 'column.reset', 'column.show', 'drafts.reveal', 'note.freeze', 'note.pin', 'note.unfreeze', 'note.unpin',
  'settings.update', 'talk.assign', 'talk.end', 'template.apply', 'timer.pause', 'timer.reset', 'timer.start', 'turn.set', 'vote.close', 'vote.reopen', 'vote.reset', 'vote.reveal',
].sort()

describe('who may steer, exactly', () => {
  it('lists the commands that steer the session, and no others', () => {
    expect([...PRIVILEGED_COMMANDS].sort()).toEqual(EXPECTED_PRIVILEGED)
  })

  it('refuses every one of them from a participant on a board with one facilitator (before the command is even read)', () => {
    const l = started()
    for (const type of EXPECTED_PRIVILEGED) expect(foldEvent(l, cmd(ALICE, { t: type } as unknown as Command)), type).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('classifies bodies: role changes and genesis are privileged, naming yourself and content are not', () => {
    for (const t of ['role.delegate', 'role.revoke', 'role.handover', 'role.claim', 'participant.hide', 'participant.unhide', 'participant.remove', 'participant.rename', 'genesis'] as const) {
      expect(isPrivileged({ t, key: FAC, name: 'x', roomId, facilitatorKey: FAC } as unknown as EventBody), t).toBe(true)
    }
    expect(isPrivileged({ t: 'participant.self', name: 'x' })).toBe(false)
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'note.add', columnId: 'x', text: 'y' }, name: null, showName: false })).toBe(false)
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'vote.close' }, name: null, showName: false })).toBe(true)
  })

  it('lets a participant name themselves and post content, but not change a role, with one facilitator', () => {
    const l = started()
    expect(foldEvent(l, ev(ALICE, { t: 'participant.self', name: 'Ann' })).ok).toBe(true)
    expect(foldEvent(l, ev(ALICE, { t: 'role.delegate', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, ev(ALICE, { t: 'participant.hide', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('on an open board a participant still names themselves, and a refused role change leaves no trace', () => {
    const l = open()
    expect(foldEvent(l, ev(ALICE, { t: 'participant.self', name: 'Ann' })).ledger.selfNames[ALICE]).toBe('Ann')
    expect(foldEvent(l, ev(ALICE, { t: 'role.delegate', key: BOB }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
  })

  it('on an open board, no command that carries the mode switch lets a participant change it, board.init included', () => {
    const l = open()
    const init = (openFacilitation?: boolean): Command => ({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', ...(openFacilitation === undefined ? {} : { openFacilitation }) })
    for (const flag of [true, false]) expect(foldEvent(l, cmd(ALICE, init(flag))), `board.init ${flag}`).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, cmd(ALICE, init())).ok).toBe(true)
    const byFacilitator = foldEvent(l, cmd(FAC, init(false)))
    expect(byFacilitator.ok).toBe(true)
    expect(byFacilitator.ledger.board.settings.openFacilitation).toBe(false)
    const co = foldAll(l, [ev(FAC, { t: 'role.delegate', key: CO })])
    expect(foldEvent(co, cmd(CO, init(false))).ok).toBe(true)
  })

  it('tells facilitators, co-facilitators and participants apart, on closed and open boards', () => {
    const closed = foldAll(started(), [ev(FAC, { t: 'role.delegate', key: CO })])
    expect([FAC, CO, ALICE].map((k) => roleOf(closed, k))).toEqual(['facilitator', 'co-facilitator', 'participant'])
    expect([FAC, CO, ALICE].map((k) => canSteer(closed, k))).toEqual([true, true, false])
    expect([FAC, CO, ALICE].map((k) => bypassesPhaseRules(closed, k))).toEqual([true, true, false])
    const everyone = foldAll(closed, [cmd(FAC, { t: 'settings.update', openFacilitation: true })])
    expect([FAC, CO, ALICE].map((k) => canSteer(everyone, k))).toEqual([true, true, true])
    expect([FAC, CO, ALICE].map((k) => bypassesPhaseRules(everyone, k))).toEqual([true, true, false])
  })

  it('on an open board a participant steers and posts, but cannot close the board or switch the mode', () => {
    const l = open()
    expect(foldEvent(l, cmd(ALICE, { t: 'vote.close' })).ok).toBe(true)
    expect(foldEvent(l, cmd(ALICE, { t: 'note.add', columnId: l.board.columns[0]!.id, text: 'hi' })).ok).toBe(true)
    expect(foldEvent(l, cmd(ALICE, { t: 'settings.update', openFacilitation: false }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, cmd(ALICE, { t: 'board.destroy' }))).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(foldEvent(l, cmd(ALICE, { t: 'settings.update', locked: true })).ok).toBe(true)
  })
})

describe('roles, exactly', () => {
  it('never revokes the facilitator key or the lead', () => {
    const handed = foldAll(started(), [ev(FAC, { t: 'role.handover', key: ALICE })])
    expect(handed.lead).toBe(ALICE)
    expect(foldEvent(handed, ev(FAC, { t: 'role.revoke', key: ALICE }))).toMatchObject({ ok: false, reason: 'forbidden' })
    expect(foldEvent(handed, ev(FAC, { t: 'role.revoke', key: FAC }))).toMatchObject({ ok: false, reason: 'forbidden' })
    const delegated = foldAll(handed, [ev(ALICE, { t: 'role.delegate', key: CO })])
    expect(foldEvent(delegated, ev(ALICE, { t: 'role.revoke', key: CO })).ok).toBe(true)
  })

  it('truncates the name a facilitator gives, and the name a participant gives themselves, to the display limit', () => {
    const long = 'N'.repeat(LIMITS.displayName + 16)
    const renamed = foldAll(started(), [ev(FAC, { t: 'participant.rename', key: ALICE, name: `  ${long}  ` })])
    expect(renamed.names[ALICE]).toBe('N'.repeat(LIMITS.displayName))
    const self = foldAll(started(), [ev(BOB, { t: 'participant.self', name: `  ${long}  ` })])
    expect(self.selfNames[BOB]).toBe('N'.repeat(LIMITS.displayName))
  })
})

describe('an empty ledger and derived ids, exactly', () => {
  it('starts with nobody, no names and no recent events, and a board whose ids come from the room', () => {
    const l = emptyLedger(roomId)
    expect(l).toMatchObject({ roomId, facilitatorKey: null, lead: null, facilitators: [], hidden: [], removed: [], names: {}, selfNames: {}, applied: 0, recent: {} })
    const seed = `genesis-${roomId}`.slice(-10)
    expect(l.board.columns.map((c) => c.id)).toEqual(l.board.columns.map((_, i) => `${seed}${i.toString(36)}`))
  })

  it('derives the ids of what an event creates from the last ten characters of its id, counting in base 36', () => {
    const l = started()
    const id = '01JABCDEFGHJKMNPQRSTVWXYZ0'
    const items = Array.from({ length: 12 }, (_, i) => ({ columnId: l.board.columns[0]!.id, text: `n${i}` }))
    const out = foldEvent(l, cmd(FAC, { t: 'note.addMany', items }, 5_000, id))
    expect(out.ok).toBe(true)
    expect(Object.keys(out.ledger.board.notes)).toEqual(Array.from({ length: 12 }, (_, i) => `${id.slice(-10)}${i.toString(36)}`))
  })
})

describe('the rate limit, exactly', () => {
  const post = (author: string, at: number, n: number) => cmd(author, { t: 'note.add', columnId: started().board.columns[0]!.id, text: `n${n}` }, at, `01J${String(100_000 + n).padStart(23, '0')}`)
  /** FAC and the board, then the first `count` events of ALICE at the same time. */
  const filled = (count: number, at = 5_000) => {
    let l = started()
    for (let i = 0; i < count; i++) l = foldEvent(l, post(ALICE, at, i)).ledger
    return l
  }

  it('accepts as many events as the budget in a window and refuses the next one', () => {
    const full = filled(LIMITS.foldRateMax)
    expect(full.recent[ALICE]).toHaveLength(LIMITS.foldRateMax)
    expect(foldEvent(full, post(ALICE, 5_000, 999))).toMatchObject({ ok: false, reason: 'rate-limited' })
    expect(foldEvent(filled(LIMITS.foldRateMax - 1), post(ALICE, 5_000, 999)).ok).toBe(true)
  })

  it('counts an event in the window until the moment the window has moved past it, not a millisecond longer', () => {
    const full = filled(LIMITS.foldRateMax, 5_000)
    expect(foldEvent(full, post(ALICE, 5_000 + LIMITS.foldRateWindowMs - 1, 999))).toMatchObject({ ok: false, reason: 'rate-limited' })
    expect(foldEvent(full, post(ALICE, 5_000 + LIMITS.foldRateWindowMs, 999)).ok).toBe(true)
  })

  it('keeps one budget per author', () => {
    const full = filled(LIMITS.foldRateMax)
    expect(foldEvent(full, post(BOB, 5_000, 999)).ok).toBe(true)
  })

  it('remembers only what is still in the window after an accepted event', () => {
    const after = foldEvent(filled(3, 5_000), post(ALICE, 5_000 + LIMITS.foldRateWindowMs, 99)).ledger
    expect(after.recent[ALICE]).toEqual([5_000 + LIMITS.foldRateWindowMs])
    const first = foldEvent(started(), post(BOB, 7_000, 1)).ledger
    expect(first.recent[BOB]).toEqual([7_000])
  })

  it('does not count the genesis, and a second genesis is a duplicate before it is anything else', () => {
    const l = started()
    expect(l.recent).toEqual({})
    const full = foldAll(l, Array.from({ length: LIMITS.foldRateMax }, (_, i) => post(FAC, 5_000, i)))
    expect(full.recent[FAC]).toHaveLength(LIMITS.foldRateMax)
    expect(foldEvent(full, genesis())).toMatchObject({ ok: false, reason: 'duplicate-genesis' })
  })

  it('does not record an event that was refused', () => {
    const full = filled(LIMITS.foldRateMax)
    expect(foldEvent(full, post(ALICE, 5_000, 999)).ledger).toBe(full)
  })
})
