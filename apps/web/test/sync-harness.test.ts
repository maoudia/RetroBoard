import { afterEach, describe, expect, it } from 'vitest'
import { createBoardAs, World } from './sync-harness'

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
