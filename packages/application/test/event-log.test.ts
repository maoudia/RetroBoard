import { describe, expect, it } from 'vitest'
import type { VerifiedEvent } from '@retroboard/domain'
import { EventLog } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const ALICE = 'a'.repeat(42) + 'A'
const id = (n: number) => `01J${String(n).padStart(23, '0')}`
const genesis: VerifiedEvent = { id: id(1), at: 10, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }
const lock = (n: number, at: number, locked: boolean): VerifiedEvent => ({ id: id(n), at, author: FAC, body: { t: 'cmd', cmd: { t: 'settings.update', locked }, name: null, showName: false } })

describe('EventLog', () => {
  it('converges whatever the arrival order', () => {
    const events = [genesis, lock(2, 20, true), lock(3, 30, false), { ...lock(4, 30, true), id: id(4) }]
    const inOrder = new EventLog(roomId); events.forEach((e) => inOrder.insert(e))
    const shuffled = new EventLog(roomId); [events[3]!, events[1]!, events[0]!, events[2]!].forEach((e) => shuffled.insert(e))
    expect(shuffled.ledger).toEqual(inOrder.ledger)
    expect(inOrder.ledger.board.settings.locked).toBe(true)
    expect(shuffled.all().map((e) => e.id)).toEqual(events.map((e) => e.id))
  })

  it('ignores duplicates and previews without inserting', () => {
    const log = new EventLog(roomId)
    expect(log.insert(genesis)).toBe(true)
    expect(log.insert(genesis)).toBe(false)
    const forged: VerifiedEvent = { ...lock(5, 40, true), author: ALICE }
    expect(log.preview(forged)).toMatchObject({ ok: false, reason: 'not-facilitator' })
    expect(log.size).toBe(1)
    expect(log.has(genesis.id)).toBe(true)
    expect(log.lastAt).toBe(10)
  })
})
