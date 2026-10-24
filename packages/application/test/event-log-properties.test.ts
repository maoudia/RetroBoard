import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { type Command, emptyLedger, foldAll, type VerifiedEvent } from '@retroboard/domain'
import { CHECKPOINT_EVERY, EventLog } from '../src'

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const PEOPLE = ['a', 'b', 'c'].map((c) => c.repeat(42) + 'A')
const genesis: VerifiedEvent = { id: '00000000000000000000000000', at: 1, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v) }
  return o
}

/** A plausible stream: notes, votes on existing notes, edits, settings by the facilitator. */
function stream(n: number, seed: number): VerifiedEvent[] {
  const base = foldAll(emptyLedger(roomId), [genesis])
  const col = base.board.columns[0]!.id
  let s = seed
  const rnd = (m: number) => { s = (s * 1103515245 + 12345) % 2 ** 31; return s % m }
  const out: VerifiedEvent[] = [genesis]
  for (let i = 1; i <= n; i++) {
    const author = rnd(5) === 0 ? FAC : PEOPLE[rnd(3)]!
    const id = `01J${String(i).padStart(23, '0')}`
    const r = rnd(10)
    const cmd: Command = r < 6 ? { t: 'note.add', columnId: col, text: `idea ${i}` }
      : r < 8 ? { t: 'vote.toggle', id: `${out[rnd(out.length)]!.id.slice(-10)}0` }
        : r < 9 ? { t: 'settings.update', locked: rnd(2) === 0 }
          : { t: 'note.edit', id: `${out[rnd(out.length)]!.id.slice(-10)}0`, text: `edit ${i}` }
    out.push({ id, at: 10 + i * 250, author, body: { t: 'cmd', cmd, name: null, showName: false } })
  }
  return out
}

describe('EventLog convergence', () => {
  it('any arrival order gives the same ledger as the sorted fold (checkpoints included)', () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 2 ** 30 }), fc.integer({ min: 0, max: 2 ** 30 }), (seed, shuffleSeed) => {
      const events = stream(CHECKPOINT_EVERY + 60, seed)
      const expected = foldAll(emptyLedger(roomId), events)
      const shuffled = [...events]
      let s = shuffleSeed
      for (let i = shuffled.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2 ** 31; const j = s % (i + 1); [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!] }
      const log = new EventLog(roomId)
      for (const e of shuffled) log.insert(e)
      expect(log.ledger).toEqual(expected)
    }), { numRuns: 15 })
  })

  it('folding never mutates an earlier ledger (checkpoints stay valid)', () => {
    const events = stream(120, 7)
    const first = deepFreeze(foldAll(emptyLedger(roomId), events.slice(0, 60)))
    expect(() => foldAll(first, events.slice(60))).not.toThrow()
  })

  it('folds 5,000 events in under 200 ms, and a late event re-folds from a checkpoint', () => {
    const events = stream(5_000, 42)
    const log = new EventLog(roomId)
    const t0 = performance.now()
    for (const e of events) log.insert(e)
    const appendMs = performance.now() - t0
    const late: VerifiedEvent = { ...events[4_950]!, id: '01J99999999999999999999999', body: { t: 'cmd', cmd: { t: 'settings.update', title: 'Late' }, name: null, showName: false }, author: FAC }
    const t1 = performance.now()
    log.insert(late)
    const lateMs = performance.now() - t1
    expect(appendMs).toBeLessThan(200 * (process.env.CI ? 3 : 1))
    expect(lateMs).toBeLessThan(appendMs)
    expect(log.size).toBe(5_002)
  })
})
