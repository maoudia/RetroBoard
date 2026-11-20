import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

/** change fix-touch-target-areas: small controls keep their look but answer to a 44 px square on touch screens. */
test.use({ hasTouch: true, isMobile: true, viewport: { width: 360, height: 740 } })

test('toolbar and column buttons answer to a 44 px square on a touch screen', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue' })
  const small = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('.mini-btn, .icon-btn')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) continue
      const a = getComputedStyle(el, '::after')
      if (parseFloat(a.width) < 43.9 || parseFloat(a.height) < 43.9) out.push(`${el.className} ${a.width}x${a.height}`)
    }
    return out
  })
  expect(small).toEqual([])
})
