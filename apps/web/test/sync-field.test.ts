/**
 * Field failures of the 2026-10-25 test, replayed against the transport (change reliable-board-sync).
 * `it.fails`: each is expected to fail until the matching task group lands, and flips to `it` then.
 * A scenario that stops failing too early is reported by vitest as a failure, so none can rot.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createBoardAs, MemoryReplica, World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

async function boardWith(...names: string[]) {
  world = new World()
  const alice = await world.join('alice', { facilitator: true })
  await createBoardAs(world, alice)
  const others = []
  for (const n of names) others.push(await world.join(n))
  expect(await world.until(() => others.every((o) => o.status === 'open' && o.columnIds.length > 0))).toBe(true)
  return { alice, others }
}

describe('field failures', () => {
  // 1. Alice-Carol cannot link (different NATs). Bob links to both and nobody forwards.
  it.fails('partial mesh: a note reaches a participant who has no direct link with its author', async () => {
    world = new World()
    const alice = await world.join('alice', { facilitator: true })
    await createBoardAs(world, alice)
    world.rtc.block('alice', 'carol')
    const bob = await world.join('bob')
    const carol = await world.join('carol')
    expect(await world.until(() => bob.columnIds.length > 0 && carol.columnIds.length > 0)).toBe(true)
    alice.note('from alice')
    carol.note('from carol')
    expect(await world.until(() => world.converged() && alice.notes.length === 2, 20_000)).toBe(true)
  })

  // 2. The relay was evicted from memory (sockets stay), then someone who cannot link joins.
  it.fails('late joiner without any direct link after the relay lost its memory sees the board', async () => {
    const { alice, others } = await boardWith('bob')
    alice.note('before')
    await world.until(() => others[0]!.notes.includes('before'))
    // dave has no WebRTC at all. The bridge already announced itself once.
    const early = await world.join('erin', { p2p: false })
    await world.until(() => early.notes.includes('before'), 20_000)
    world.relay.forget()
    const dave = await world.join('dave', { p2p: false })
    expect(await world.until(() => dave.notes.includes('before'), 20_000)).toBe(true)
  })

  // 3. A WebSocket blip: commands are dropped while the transport re-syncs.
  it.fails('a command sent while the connection is lost is kept and delivered later', async () => {
    const { alice, others } = await boardWith('bob')
    const bob = others[0]!
    bob.setOnline(false)
    await world.run(200)
    expect(bob.note('written offline')).toBe(true)
    bob.setOnline(true)
    expect(await world.until(() => alice.notes.includes('written offline'), 30_000)).toBe(true)
    expect(bob.notes.filter((n) => n === 'written offline')).toHaveLength(1)
  })

  // 4. Reload right after publishing, nobody else online, the relay holds nothing.
  it.fails('the facilitator reloads right after publishing and keeps the board and the note', async () => {
    world = new World()
    const replica = new MemoryReplica()
    const seed = { value: null as string | null }
    const alice = await world.join('alice', { facilitator: true, replica, seed })
    await createBoardAs(world, alice)
    alice.note('just written')
    await world.until(() => alice.notes.includes('just written'))
    await world.run(100) // less than the 250 ms write batch
    alice.close() // the page is gone
    const again = await world.join('alice', { facilitator: true, replica, seed })
    expect(await world.until(() => again.notes.includes('just written'), 10_000)).toBe(true)
  })

  // 5. The facilitator link opened on a second device while the first one is offline.
  it.fails('a facilitator link on a new device does not start a second board', async () => {
    world = new World()
    const alice = await world.join('alice', { facilitator: true, creator: true })
    await createBoardAs(world, alice)
    alice.note('original')
    await world.until(() => alice.notes.includes('original'))
    await world.run(500)
    alice.close()
    const phone = await world.join('phone', { facilitator: true, creator: false })
    await world.run(5_000)
    // Nobody holds the board yet: the phone waits, it never invents one.
    expect(phone.snapshot).toBeNull()
    const back = await world.join('alice', { facilitator: true, creator: true, replica: alice.replica, seed: alice.opts.seed })
    expect(await world.until(() => phone.notes.includes('original') && back.notes.includes('original'), 20_000)).toBe(true)
  })

  // 6. A device whose clock is more than a minute behind. HybridClock.receive caps what it learns at
  // wall + 60 s, so its events get a time before the genesis, sort first in the total order and are
  // ignored by every replica, silently (preview() only checks the head of the log).
  it.fails('a participant with a clock one hour behind can still publish', async () => {
    const { alice } = await boardWith()
    const late = await world.join('late', { clockSkewMs: -3_600_000 })
    expect(await world.until(() => late.columnIds.length > 0)).toBe(true)
    late.note('from the past')
    expect(await world.until(() => alice.notes.includes('from the past'), 10_000)).toBe(true)
  })

  // 7. IndexedDB refuses writes (quota, private mode, closed database): today nothing says so.
  it.fails('the page is told when the board cannot be saved on this device', async () => {
    world = new World()
    const replica = new MemoryReplica()
    replica.failWrites = true
    const alice = await world.join('alice', { facilitator: true, replica })
    await createBoardAs(world, alice)
    alice.note('cannot be saved')
    await world.run(1_000)
    expect(alice.replicaState).toBe('failing')
  })
})
