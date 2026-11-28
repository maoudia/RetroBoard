import { afterEach, describe, expect, it, vi } from 'vitest'
import { cursorsEnabled } from '../app/utils/features'

const withConfig = (cursorsEnabledValue: unknown) => vi.stubGlobal('useRuntimeConfig', () => ({ public: { cursorsEnabled: cursorsEnabledValue } }))

describe('cursorsEnabled (change cursors-off-for-now, 1.1)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is on only when the build-time flag is exactly true', () => {
    withConfig(true)
    expect(cursorsEnabled()).toBe(true)
  })

  it('is off by default and for any other value (unset, false, the string "true")', () => {
    for (const v of [undefined, false, 'true', 1, null]) {
      withConfig(v)
      expect(cursorsEnabled()).toBe(false)
    }
  })
})
