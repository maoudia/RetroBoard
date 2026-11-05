import { describe, expect, it } from 'vitest'
import { browserName, bugReportUrl, FOLLOW_LINKS, screenClass } from '../app/utils/feedback'

describe('feedback links', () => {
  it('prefills the environment only, never board data', () => {
    const url = bugReportUrl({ version: '1.33.0', browser: 'Chrome 130', screen: 'desktop', locale: 'fr' })
    expect(url.startsWith('https://github.com/maoudia/retroboard/issues/new?')).toBe(true)
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('RetroBoard 1.33.0, Chrome 130, desktop, fr')
    for (const secret of ['#r=', 'roomKey', 'passcode', 'localhost']) expect(url).not.toContain(secret)
  })
  it('classifies the screen and the browser coarsely', () => {
    expect(screenClass(390)).toBe('phone')
    expect(screenClass(800)).toBe('tablet')
    expect(screenClass(1440)).toBe('desktop')
    expect(screenClass(2560)).toBe('tv')
    expect(browserName('Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36')).toBe('Chrome 130')
    expect(browserName('Mozilla/5.0 (Macintosh) Version/17.2 Safari/605.1.15')).toBe('Safari 17')
  })
  it('lists the owner profiles over https', () => {
    expect(FOLLOW_LINKS.map((l) => l.id)).toEqual(['github', 'linkedin', 'x', 'devto'])
    expect(FOLLOW_LINKS.every((l) => l.href.startsWith('https://'))).toBe(true)
    // Same profiles as the "Find me on" list of https://www.maoudia.com/ (change hotfix-ux-wave8).
    expect(Object.fromEntries(FOLLOW_LINKS.map((l) => [l.id, l.href]))).toEqual({
      github: 'https://github.com/aoudiamoncef',
      linkedin: 'https://www.linkedin.com/in/moncef-aoudia-7723b311b',
      x: 'https://twitter.com/aoudiamoncef',
      devto: 'https://dev.to/aoudiamoncef',
    })
  })
})
