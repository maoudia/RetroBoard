import { afterEach, describe, expect, it } from 'vitest'
import { createBoardAs, World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

describe('cursors and focus stay peer to peer', { timeout: 60_000 }, () => {
  it('a cursor and a focus frame reach the other participant over the direct link', async () => {
    world = new World()
    const alice = await world.join('alice', { facilitator: true })
    await createBoardAs(world, alice)
    const bob = await world.join('bob')
    expect(await world.until(() => bob.status === 'open' && (bob.links?.peers ?? 0) === 1 && (alice.links?.peers ?? 0) === 1)).toBe(true)
    alice.transport.sendCursor({ anchor: null, x: 100, y: 100, drag: false } as never)
    alice.transport.sendFocus({ column: alice.columnIds[0], note: null, typing: true } as never)
    expect(await world.until(() => bob.cursors.length > 0 && bob.focus.length > 0)).toBe(true)
    expect(bob.cursors.at(-1)).toBe('alice')
  })
})
