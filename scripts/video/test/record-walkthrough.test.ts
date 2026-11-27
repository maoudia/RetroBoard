import { describe, expect, it } from 'vitest'
// @ts-expect-error plain ES module without declarations
import { FRAME_CSS, LOCALES, outputName, pickLocales, recordMs, SCENE_MS, SCENES } from '../record-walkthrough.mjs'

describe('record-walkthrough', () => {
  it('films one full loop plus a margin', () => {
    expect(recordMs()).toBe(SCENES * SCENE_MS + 1500)
    expect(recordMs()).toBeGreaterThan(42_000)
  })
  it('names one file per language', () => {
    expect(LOCALES.map(outputName)).toEqual(['walkthrough-fr.webm', 'walkthrough-en.webm'])
  })
  it('picks the languages', () => {
    expect(pickLocales([])).toEqual(['fr', 'en'])
    expect(pickLocales(['--locale', 'en'])).toEqual(['en'])
    expect(() => pickLocales(['--locale', 'de'])).toThrow(/must be one of/)
  })
  it('frames the walkthrough alone and hides its controls', () => {
    expect(FRAME_CSS).toContain('[data-testid="walkthrough"]')
    expect(FRAME_CSS).toContain('.ctl { display: none')
  })
})
