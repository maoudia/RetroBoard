import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ESM script without types
import { greenNight, streak } from '../nightly-streak.mjs'

const job = (name: string, conclusion: string) => ({ name, conclusion })

describe('nightly gate', () => {
  it('is green when every job outside WebKit succeeded', () => {
    expect(greenNight([job('Playwright (chromium 1/3)', 'success'), job('Playwright (firefox 1/3)', 'success'), job('Playwright (webkit 3/8)', 'failure')])).toBe(true)
  })

  it('is red for any failed, cancelled or skipped job outside WebKit', () => {
    for (const conclusion of ['failure', 'cancelled', 'skipped']) expect(greenNight([job('Playwright (phone 2/3)', conclusion), job('Playwright (tv 1/3)', 'success')])).toBe(false)
  })

  it('is red when no job outside WebKit ran', () => {
    expect(greenNight([])).toBe(false)
    expect(greenNight([job('Playwright (webkit 1/8)', 'success')])).toBe(false)
  })

  it('counts the green nights since the last red one, newest first', () => {
    expect(streak([true, true, false, true])).toBe(2)
    expect(streak([false, true])).toBe(0)
    expect(streak([true, true])).toBe(2)
    expect(streak([])).toBe(0)
  })
})
