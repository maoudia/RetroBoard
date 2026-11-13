import { MAX_ENVELOPES_PER_MESSAGE, PUB_PACE_MAX, RELAY_BUFFER } from '@retroboard/protocol'
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
  // 3.1: 9,002 envelopes are 46 frames of 200. Sent at once they went over the 80 frames in 10 s the relay closes a
  // socket for (close 1008); `push` now sends at most PUB_PACE_MAX per window and the rest when the window passed.
  it('a holder uploads 9,000 small envelopes to the empty relay without being cut off, paced under the frame budget', async () => {
    const holder = await holderOfBoardOf(9_000, 'small')
    world = holder.world
    const { held } = holder
    expect(await world.until(() => world.relay.stats.pubFrames >= PUB_PACE_MAX || world.relay.closes.length > 0, 120_000)).toBe(true)
    const firstWindow = Date.now()
    expect([world.relay.closes, world.relay.stats.pubFrames]).toEqual([[], PUB_PACE_MAX])
    expect(await world.until(() => world.relay.stats.pubEnvs >= held || world.relay.closes.length > 0, 120_000)).toBe(true)
    expect(world.relay.closes).toEqual([])
    // The frames past the budget waited for the window to pass.
    expect(Date.now() - firstWindow).toBeGreaterThanOrEqual(9_000)
    expect([world.relay.stats.pubEnvs, world.relay.stats.pubFrames]).toEqual([held, Math.ceil(held / MAX_ENVELOPES_PER_MESSAGE)])
    // The relay keeps at most RELAY_BUFFER envelopes.
    expect(world.relay.buffered).toBe(RELAY_BUFFER)
  })
})
