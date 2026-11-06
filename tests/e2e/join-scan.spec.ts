import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard, enterName, settle } from './helpers'

/** A page with a camera that shows a flat picture and a QR reader that "sees" `payload` (the real ones need hardware). */
async function fakeCamera(page: Page, payload: string | string[], camera: 'ok' | 'denied' | 'none' = 'ok') {
  await page.addInitScript(({ payload, camera }) => {
    const [first, ...later] = ([] as string[]).concat(payload)
    // The codes after the first one only show up once the test releases them, so it can inspect the dialog meanwhile.
    class FakeDetector {
      static getSupportedFormats() { return Promise.resolve(['qr_code']) }
      async detect() { return [{ rawValue: (window as unknown as { __release?: boolean }).__release && later.length ? later[0]! : first! }] }
    }
    Object.assign(window, { BarcodeDetector: FakeDetector })
    ;(window as unknown as { __stopped: number }).__stopped = 0
    navigator.mediaDevices.getUserMedia = async () => {
      if (camera !== 'ok') throw new DOMException('no', camera === 'denied' ? 'NotAllowedError' : 'NotFoundError')
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 48
      canvas.getContext('2d')!.fillRect(0, 0, 64, 48)
      const stream = canvas.captureStream(5)
      for (const track of stream.getTracks()) { const stop = track.stop.bind(track); track.stop = () => { (window as unknown as { __stopped: number }).__stopped++; stop() } }
      return stream
    }
  }, { payload, camera })
}

test.describe('scan a QR code to join (change short-links-and-join)', () => {
  test.skip(({ isMobile }) => isMobile, 'the camera dialog is checked on desktop with a fake camera')

  test('the camera reads the invitation QR code and opens the board; the camera is released', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
    const link = await page.getByTestId('share-url').inputValue()

    const ctx = await browser.newContext()
    const bob = await ctx.newPage()
    // The first code is not a board (a wifi QR code), the second is the invitation.
    await fakeCamera(bob, ['WIFI:T:WPA;S:cafe;P:secret;;', link])
    await bob.goto('/')
    await bob.getByTestId('join-scan').click()
    await expect(bob.getByTestId('scan-state')).toHaveAttribute('data-state', 'scanning')
    await expect(bob.getByTestId('scan-state')).toContainText('pas un lien RetroBoard')
    await settle(bob)
    const results = await new AxeBuilder({ page: bob }).include('dialog[open]').analyze()
    expect(results.violations).toEqual([])
    await bob.evaluate(() => { (window as unknown as { __release: boolean }).__release = true })
    await bob.waitForURL(/\/boards\/?#c=/)
    await enterName(bob, 'Bob')
    await expect(bob.getByTestId('board')).toBeVisible()
    expect(await bob.evaluate(() => (window as unknown as { __stopped: number }).__stopped)).toBeGreaterThan(0)
    await ctx.close()
  })

  test('a refused or missing camera says what to do instead, and Escape closes the dialog', async ({ page }) => {
    await fakeCamera(page, 'x', 'denied')
    await page.goto('/')
    await page.getByTestId('join-scan').click()
    await expect(page.getByTestId('scan-state')).toHaveAttribute('data-state', 'denied')
    await expect(page.getByTestId('scan-state')).toContainText('colle le lien')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('scan-state')).toHaveCount(0)
    await expect(page.getByTestId('join-input')).toBeVisible()
  })

  test('there is no scan button when the browser cannot read QR codes', async ({ page }) => {
    await page.addInitScript(() => { Reflect.deleteProperty(window, 'BarcodeDetector') })
    await page.goto('/')
    await expect(page.getByTestId('join-input')).toBeVisible()
    await expect(page.getByTestId('join-scan')).toHaveCount(0)
  })
})
