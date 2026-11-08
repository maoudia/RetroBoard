import { expect, test } from '@playwright/test'
import { axe, settle } from './helpers'

// Change user-manual-and-tutorials: the tutorial video of the guide is self-hosted (media-src 'self'), captioned, loads only
// when played, and nothing leaves the origin.
for (const locale of ['fr', 'en'] as const) {
  test(`guide ${locale}: the tutorial video plays under the CSP with captions, from this origin only`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin
    const outside: string[] = []
    const problems: string[] = []
    page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outside.push(r.url()) })
    page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
    const res = await page.goto(`/guide/${locale}/index.html`)
    expect(res?.headers()['content-security-policy']).toContain("media-src 'self'")
    const video = page.locator('video')
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute('preload', 'none')
    const track = video.locator('track')
    await expect(track).toHaveAttribute('kind', 'captions')
    await expect(track).toHaveAttribute('srclang', locale)
    await expect(track).toHaveAttribute('default', '')

    const webm = await page.request.get(`/guide/video/${locale}/tutorial.webm`)
    expect(webm.status()).toBe(200)
    expect(webm.headers()['content-type']).toContain('video/webm')
    const vtt = await page.request.get(`/guide/video/${locale}/tutorial.vtt`)
    expect(vtt.status()).toBe(200)
    expect((await vtt.text()).startsWith('WEBVTT')).toBe(true)

    // Nothing is fetched before the play button; then the metadata loads and the captions track is attached and readable.
    await video.evaluate((v) => v.load())
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).readyState), { message: 'video metadata' }).toBeGreaterThanOrEqual(1)
    expect(await video.evaluate((v) => (v as HTMLVideoElement).duration)).toBeGreaterThan(30)
    const cues = await video.evaluate(async (v) => {
      const t = (v as HTMLVideoElement).textTracks[0]!
      t.mode = 'hidden'
      for (let i = 0; i < 50 && !t.cues?.length; i++) await new Promise((r) => setTimeout(r, 100))
      return t.cues?.length ?? 0
    })
    expect(cues).toBe(12)
    expect(outside).toEqual([])
    expect(problems).toEqual([])
  })

  test(`guide ${locale}: the index page with the video has no accessibility violation`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/guide/${locale}/index.html`)
    await settle(page)
    const scan = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    expect(scan.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
  })
}
