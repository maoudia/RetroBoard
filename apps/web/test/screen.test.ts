import { describe, expect, it } from 'vitest'
import { applyScreen } from '../app/utils/screen'
import { pseudoLocale, t, td } from '../app/i18n'

/** The root element as far as applyScreen needs it: the data attributes and the style declaration. */
function fakeRoot() {
  const written: Record<string, string> = {}
  const root = { dataset: {} as Record<string, string>, style: { setProperty: (k: string, v: string) => { written[k] = v } } }
  return { root: root as unknown as HTMLElement, data: root.dataset, written }
}

describe('applyScreen', () => {
  it('sets data-screen and the tokens of the class', () => {
    const { root, data, written } = fakeRoot()
    expect(applyScreen(390, root)).toBe('phone')
    expect(data.screen).toBe('phone')
    expect(written['--type-scale']).toBe('1')
    expect(written['--bp-tv']).toBe('2400px')
    expect(applyScreen(3840, root)).toBe('tv')
    expect(data.screen).toBe('tv')
    expect(written['--type-scale']).toBe('1.5')
  })

  it('writes nothing while the width stays inside one class', () => {
    const { root, written } = fakeRoot()
    applyScreen(1100, root)
    const before = { ...written }
    expect(applyScreen(1500, root)).toBe('laptop')
    expect(written).toEqual(before)
  })
})

describe('pseudo-locale in the web app', () => {
  it('lengthens the French text when asked, and leaves a missing key visible', () => {
    const normal = t('column.delete.msgNotes', { n: 2, title: 'X' })
    expect(normal).not.toMatch(/^\[/)
    pseudoLocale.value = true
    try {
      expect(t('column.delete.msgNotes', { n: 2, title: 'X' })).toMatch(/^\[.*\]$/)
      expect(td('nope.key')).toBe('nope.key')
    } finally {
      pseudoLocale.value = false
    }
    expect(t('column.delete.msgNotes', { n: 2, title: 'X' })).toBe(normal)
  })
})
