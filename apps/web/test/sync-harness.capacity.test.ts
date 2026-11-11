import { RELAY_BUFFER } from '@retroboard/protocol'
import { afterEach, describe, expect, it } from 'vitest'
import { holderOfBoardOf, type World } from './sync-harness'

let world: World
afterEach(() => world?.dispose())

/**
 * The capacity scenario of change deploy-safe-sessions, task group 1. Loading 9,000 envelopes takes about 25 s on
 * real threads, so the mutation run leaves this file out (vitest.mutation.config.ts: it would be repeated for every
 * mutant); the unit tests and the coverage run still run it.
 */
describe('a relay deploy during a live board, capacity', { timeout: 180_000 }, () => {
  // 3.1: 9,000 envelopes are 90 frames sent at once, the relay closes a socket after 80 frames in 10 s (close 1008).
  it.fails('a holder uploads 9,000 small envelopes to the empty relay without being cut off', async () => {
    world = (await holderOfBoardOf(9_000, 'small')).world
    // The relay keeps at most RELAY_BUFFER envelopes: it is full when the whole upload went through.
    await world.until(() => world.relay.buffered === RELAY_BUFFER || world.relay.closes.length > 0, 120_000)
    expect(world.relay.closes).toEqual([])
    expect(world.relay.buffered).toBe(RELAY_BUFFER)
  })
})
