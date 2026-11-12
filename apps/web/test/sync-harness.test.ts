import { afterEach, describe, expect, it } from 'vitest'
import { createBoardAs, holderOfBoardOf, type Peer, World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

describe('sync harness smoke', { timeout: 60_000 }, () => {
  it('three peers on a full mesh converge on the same board', async () => {
    world = new World()
    const alice = await world.join('alice', { facilitator: true })
    await createBoardAs(world, alice)
    const bob = await world.join('bob')
    const carol = await world.join('carol')
    expect(await world.until(() => bob.status === 'open' && carol.status === 'open')).toBe(true)
    expect(await world.until(() => bob.columnIds.length > 0 && carol.columnIds.length > 0)).toBe(true)
    expect(bob.note('from bob')).toBe(true)
    expect(carol.note('from carol')).toBe(true)
    expect(alice.note('from alice')).toBe(true)
    expect(await world.until(() => world.converged() && alice.notes.length === 3)).toBe(true)
    expect(alice.notes).toEqual(['from alice', 'from bob', 'from carol'])
    await world.run(1_500)
    // With a complete mesh the notes never crossed the relay; it only holds the re-seeded backup of the board.
    expect(world.relay.buffered).toBeGreaterThan(0)
    expect(world.relay.stats.pubFrames).toBeLessThanOrEqual(6)
  })
})

/**
 * What a relay deploy does to a live board (change deploy-safe-sessions, task group 1).
 * Production is deployed several times a day and a retro lasts an hour: a restart of the relay
 * (memory gone, every socket closed) during a board is the normal case.
 *
 * Each scenario fails (or failed) for the reason in its comment, so it is marked `it.fails` until the group that
 * fixes it removes the marker (2.2 unknown command, done; 3.1 uploads, 4.2 links).
 */
describe('a relay deploy during a live board', { timeout: 180_000 }, () => {
  async function boardWith(...names: string[]) {
    world = new World()
    const alice = await world.join('alice', { facilitator: true })
    await createBoardAs(world, alice)
    const others = []
    for (const n of names) others.push(await world.join(n))
    expect(await world.until(() => others.every((o) => o.status === 'open' && o.columnIds.length > 0))).toBe(true)
    return { alice, others }
  }

  // 4.2: `ws.onclose` closes the mesh, so the links die with the relay socket and nothing flows until the
  // reconnect (new connection ids, a new WebRTC set-up, a full re-sync).
  it.fails('the relay closes every socket: the three direct links stay open and an event sent meanwhile reaches the others', async () => {
    const { alice, others } = await boardWith('bob', 'carol')
    const [bob, carol] = others as [Peer, Peer]
    const trio = [alice, bob, carol]
    expect(await world.until(() => trio.every((p) => p.links?.peers === 2))).toBe(true)
    const links = world.rtc.pcs.size
    world.relay.deploy()
    await world.run(300)
    expect(world.rtc.pcs.size).toBe(links)
    expect(trio.map((p) => p.links?.peers)).toEqual([2, 2, 2])
    // The relay is still down: the event can only travel on the direct links.
    expect(bob.note('written during the deploy')).toBe(true)
    expect(await world.until(() => alice.notes.includes('written during the deploy') && carol.notes.includes('written during the deploy'), 2_000)).toBe(true)
    world.relay.reopen()
  })

  // An event whose body this version cannot parse is kept and passed on, and the page is told once (2.2).
  it('an event written by a newer version is kept, and the page is told once to reload', async () => {
    const { alice, others } = await boardWith('bob')
    const bob = others[0]!
    await world.run(1_000)
    const stored = [alice, bob].map((p) => p.replica.count(world.roomId))
    await world.publishFromNewerVersion()
    await world.run(500)
    await world.publishFromNewerVersion()
    await world.run(500)
    expect([alice, bob].map((p) => p.replica.count(world.roomId))).toEqual(stored.map((n) => n + 2))
    expect([alice.notices.filter((k) => k === 'newer-version'), bob.notices.filter((k) => k === 'newer-version')]).toEqual([['newer-version'], ['newer-version']])
  })

  it('a tab that joins later receives the event of the newer version from its peers, and the board is unchanged', async () => {
    const { alice, others } = await boardWith('bob')
    const bob = others[0]!
    await world.run(1_000)
    const notes = [...alice.notes]
    await world.publishFromNewerVersion()
    await world.run(500)
    const carol = await world.join('carol')
    expect(await world.until(() => carol.status === 'open' && carol.columnIds.length > 0)).toBe(true)
    expect(await world.until(() => carol.replica.count(world.roomId) === alice.replica.count(world.roomId))).toBe(true)
    expect(carol.notices.filter((k) => k === 'newer-version')).toEqual(['newer-version'])
    expect([alice.notes, bob.notes, carol.notes]).toEqual([notes, notes, notes])
  })

  // The upload scenarios stop waiting as soon as the relay cuts a socket: while they are `it.fails` they would
  // otherwise spin the whole simulated budget (15 s) on every mutant of the mutation run.
  // 3.1: `push` cuts by count (100), the relay refuses a frame over 256 KB (close 1009), and `attempts` is reset
  // on open, so the same upload is sent again at once.
  it.fails('a holder uploads 100 envelopes of 3 KB to the empty relay without being cut off', async () => {
    const holder = await holderOfBoardOf(100, 'bulky')
    world = holder.world
    const { held } = holder
    await world.until(() => world.relay.buffered === held || world.relay.closes.length > 0, 60_000)
    expect(world.relay.closes).toEqual([])
    expect(world.relay.buffered).toBe(held)
  })
})
