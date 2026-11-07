import type { VerifiedEvent } from '@retroboard/domain'
import { describe, expect, it, vi } from 'vitest'
import { CHECKPOINT_EVERY, EventLog } from '../src'

const folds = vi.hoisted(() => ({ count: 0 }))
vi.mock('@retroboard/domain', async (importOriginal) => {
  const real = await importOriginal<typeof import('@retroboard/domain')>()
  return { ...real, foldEvent: (...args: Parameters<typeof real.foldEvent>) => { folds.count++; return real.foldEvent(...args) } }
})

const roomId = 'Ab3dEfGhIjKlMnOpQrStUv'
const FAC = 'f'.repeat(42) + 'A'
const id = (n: number) => `01J${String(n).padStart(23, '0')}`
const genesis: VerifiedEvent = { id: id(1), at: 1, author: FAC, body: { t: 'genesis', roomId, facilitatorKey: FAC } }
const lock = (n: number, at: number): VerifiedEvent => ({ id: id(n), at, author: FAC, body: { t: 'cmd', cmd: { t: 'settings.update', locked: n % 2 === 0 }, name: null, showName: false } })

describe('the order of an EventLog', () => {
  it('goes by time first, then by id', () => {
    const l = new EventLog(roomId)
    for (const e of [lock(9, 30), genesis, lock(5, 30), lock(8, 20), lock(2, 40)]) l.insert(e)
    expect(l.all().map((e) => [e.at, e.id])).toEqual([[1, id(1)], [20, id(8)], [30, id(5)], [30, id(9)], [40, id(2)]])
  })
})

describe('how much an EventLog folds', () => {
  const log = new EventLog(roomId)
  const total = CHECKPOINT_EVERY * 2 + 50
  log.insert(genesis)
  for (let n = 2; n <= total; n++) log.insert(lock(n, n * 10))

  it('folds one event for an append', () => {
    folds.count = 0
    log.insert(lock(total + 1, (total + 1) * 10))
    expect(folds.count).toBe(1)
  })

  it('folds again from the nearest checkpoint for a late event, not from the start', () => {
    folds.count = 0
    const at = CHECKPOINT_EVERY + 20
    log.insert(lock(total + 2, at * 10 + 5))
    const size = log.size
    expect(folds.count).toBe(size - CHECKPOINT_EVERY)
  })

  it('falls back to the start for a very early event', () => {
    folds.count = 0
    log.insert(lock(total + 3, 5))
    expect(folds.count).toBe(log.size)
  })
})
