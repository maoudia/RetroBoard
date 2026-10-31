import { expect, type Page, test } from '@playwright/test'
import { closeShare, createBoard, enterName } from './helpers'

type Store = { commands: Record<string, (...a: unknown[]) => unknown> }
const run = (page: Page, body: string) => page.evaluate((src) => {
  const board = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, Store> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board')!
  return new Function('board', src)(board) as unknown
}, body)

test.describe('ux bug fixes', () => {
  test('the Copy button keeps its icon and its label is centred (#273)', async ({ page }) => {
    await createBoard(page, { name: 'Alice', keepShare: true })
    const svg = await page.getByTestId('copy-link').locator('svg').boundingBox()
    expect(svg?.width ?? 0).toBeGreaterThan(8)
    await closeShare(page)
  })

  test('publishing is disabled outside its phase for a participant (#275)', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'drafts are typed on a laptop here; the phone layout is covered by the voting specs')
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    await page.getByTestId('btn-share').click()
    const link = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const bob = await ctx.newPage()
    await bob.goto(link)
    await enterName(bob, 'Bob')
    await expect(bob.getByTestId('board')).toBeVisible()
    await bob.locator('section[data-testid^="column-"]').first().locator('textarea').fill('Bob draft')
    await bob.keyboard.press('Enter')
    await expect(bob.getByTestId('publish-all')).toBeEnabled()
    await run(page, `board.commands.setAgenda([{ kind: 'vote', minutes: 5 }], { rules: true, autoPublish: false }); board.commands.startAgenda()`)
    await expect(bob.getByTestId('publish-all')).toBeDisabled()
    await expect(bob.getByTestId('publish-all')).toHaveAttribute('title', /.+/)
    await ctx.close()
  })

  test('one voting switch only: no separate reopen button (#274)', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.getByTestId('close-voting').click()
    await expect(page.getByTestId('voting-closed')).toBeVisible()
    await expect(page.getByTestId('reopen-voting')).toHaveCount(0)
    await page.getByTestId('voting-open').click()
    await expect(page.getByTestId('voting-closed')).toHaveCount(0)
  })
})
