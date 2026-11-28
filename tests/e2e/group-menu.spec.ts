import { expect, test, type Locator, type Page } from '@playwright/test'
import { axe, createBoard, join, publishNote, settle } from './helpers'

/** Group menu and one open group per column (change group-colors-menu-and-scope, tasks 2.1 to 3.2). */

type Store = { snapshot: { notes: { id: string; text: string; columnId: string; groupId?: string; color: number }[]; groups: { id: string; columnId: string }[] }; commands: Record<string, (...a: unknown[]) => void>; columns: { id: string }[] }
const boardStore = (page: Page) => page.evaluateHandle(() => (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board') as Store)

/** Publishes two notes in a column and groups them through the store (the drag is covered by clusters.spec.ts). */
async function groupIn(page: Page, col: number, prefix: string) {
  for (const n of [1, 2]) await publishNote(page, col, `${prefix} ${n}`)
  const store = await boardStore(page)
  await store.evaluate((s, p) => { const [a, b] = s.snapshot.notes.filter((n) => n.text.startsWith(p)); s.commands.groupNotes!(b!.id, a!.id) }, prefix)
  await settle(page)
  const find = () => store.evaluate((s, p) => s.snapshot.groups.find((g) => s.snapshot.notes.some((n) => n.groupId === g.id && n.text.startsWith(p)))?.id ?? '', prefix)
  await expect.poll(find).not.toBe('')
  return find()
}
const stack = (page: Page, gid: string) => page.getByTestId(`group-${gid}`)
const menuOf = (page: Page, gid: string) => page.getByTestId(`gmenu-menu-${gid}`)
const panels = (page: Page) => page.getByTestId('group-panel')
/** The three dots show on hover for a mouse: hovering the stack first is what a person does. */
async function openMenu(page: Page, gid: string) { await stack(page, gid).hover(); await menuOf(page, gid).click() }

test.describe('group menu', () => {
  test.skip(({ isMobile }) => isMobile, 'the menu is a bottom sheet on a phone: covered by the phone test below')

  test('recolour from the stack without opening the panel; a facilitator gets pin and freeze', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, page.url(), 'Bob')
    await bob.page.locator('dialog.dlg[open]').waitFor({ timeout: 10_000 }).then(() => bob.page.keyboard.press('Escape')).catch(() => undefined) // the offer to take over the lead
    const gid = await groupIn(page, 0, 'Deploy')
    await expect(stack(bob.page, gid)).toBeVisible()

    await openMenu(page, gid)
    await expect(page.getByTestId(`gmenu-pin-${gid}`)).toBeVisible()
    await expect(page.getByTestId(`gmenu-freeze-${gid}`)).toBeVisible()
    await page.getByTestId(`gmenu-color-${gid}-5`).click()
    await expect(stack(page, gid)).toHaveAttribute('style', /--note-5\)/)
    await expect(stack(bob.page, gid)).toHaveAttribute('style', /--note-5\)/)
    await expect(panels(page)).toHaveCount(0)

    await openMenu(bob.page, gid)
    await expect(bob.page.getByTestId(`gmenu-open-${gid}`)).toBeVisible()
    await bob.ctx.close()
  })

  test('more shades opens the same palette as a note', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const gid = await groupIn(page, 0, 'Shades')
    await openMenu(page, gid)
    await page.getByTestId(`gmenu-palette-${gid}`).click()
    await page.getByTestId('palette-more').click()
    await expect(page.locator('[data-testid^="palette-"][role="radio"]')).toHaveCount(24)
    await page.getByTestId('palette-17').click()
    await expect(stack(page, gid)).toHaveAttribute('style', /--note-17\)/)
  })

  test('keyboard walk: Enter opens, Tab walks the entries, Escape closes and focus returns to the button', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const gid = await groupIn(page, 0, 'Keys')
    const trigger = menuOf(page, gid)
    await trigger.focus()
    await expect(page.locator('.gmenu').first()).toHaveCSS('opacity', '1') // focus shows the dots
    await page.keyboard.press('Enter')
    const items = page.locator('.dd-panel:popover-open [role="menuitem"]:visible')
    await expect(items.first()).toBeVisible()
    await page.keyboard.press('Tab') // from the button into the entries, in reading order
    await expect(page.locator('.dd-panel:popover-open :focus')).toHaveCount(1)
    await page.keyboard.press('Tab')
    await expect(page.locator('.dd-panel:popover-open :focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(page.locator('.dd-panel:popover-open')).toHaveCount(0)
    await expect(trigger, await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 200) ?? '')).toBeFocused()
    await expect(panels(page)).toHaveCount(0)
  })

  test('rename from the menu opens the panel with the title focused', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const gid = await groupIn(page, 0, 'Names')
    await openMenu(page, gid)
    await page.getByTestId(`gmenu-rename-${gid}`).click()
    await expect(panels(page)).toBeVisible()
    await expect(page.getByTestId('group-title')).toBeFocused()
  })

  test('dissolving a voted group asks first; an unvoted one goes at once', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const voted = await groupIn(page, 0, 'Voted')
    const plain = await groupIn(page, 0, 'Plain')
    await page.locator('.cluster', { has: stack(page, voted) }).locator('[data-testid^="vote-"]').click()
    await openMenu(page, voted)
    await page.getByTestId(`gmenu-dissolve-${voted}`).click()
    await expect(page.getByTestId('confirm')).toBeVisible()
    await page.getByTestId('confirm').locator('xpath=preceding-sibling::button').click()
    await expect(stack(page, voted)).toBeVisible()
    await openMenu(page, voted)
    await page.getByTestId(`gmenu-dissolve-${voted}`).click()
    await page.getByTestId('confirm').click()
    await expect(stack(page, voted)).toHaveCount(0)

    await openMenu(page, plain)
    await page.getByTestId(`gmenu-dissolve-${plain}`).click()
    await expect(stack(page, plain)).toHaveCount(0)
  })

  test('the menu and the panel footer offer the same actions', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const gid = await groupIn(page, 0, 'Parity')
    await openMenu(page, gid)
    const inMenu = async (k: string) => (await page.getByTestId(`gmenu-${k}-${gid}`).count()) > 0
    const menu = { pin: await inMenu('pin'), freeze: await inMenu('freeze'), dissolve: await inMenu('dissolve'), action: await inMenu('action') }
    await page.keyboard.press('Escape')
    await stack(page, gid).click()
    await expect(page.getByTestId('group-pin')).toBeVisible()
    const footer = { pin: (await page.getByTestId('group-pin').count()) > 0, freeze: (await page.getByTestId('group-freeze').count()) > 0, dissolve: (await page.getByTestId('group-dissolve').count()) > 0, action: (await page.getByTestId('group-create-action').count()) > 0 }
    expect(footer).toEqual(menu)
  })
})

test.describe('one open group per column', () => {
  test.skip(({ isMobile }) => isMobile, 'a phone has its own test below')

  async function twoColumns(page: Page) {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const a1 = await groupIn(page, 0, 'Slow CI')
    const a2 = await groupIn(page, 0, 'Flaky')
    const b1 = await groupIn(page, 1, 'Pairing')
    return { a1, a2, b1 }
  }
  const panelOf = (page: Page, col: number) => page.locator('section[data-testid^="column-"]').nth(col).getByTestId('group-panel')

  test('two columns side by side, replace in the same column, Escape closes one panel only', async ({ page }) => {
    const { a1, a2, b1 } = await twoColumns(page)
    await stack(page, a1).click()
    await stack(page, b1).click()
    await expect(panels(page)).toHaveCount(2)
    await expect(panelOf(page, 0)).toBeVisible()
    await expect(panelOf(page, 1)).toBeVisible()
    await expect(panelOf(page, 1)).toBeFocused() // only the second one is focused

    // Another group of the first column replaces its panel; the second column is unchanged.
    // (the panel covers its column: another group opens through a jump from an action, here the same state change)
    await page.evaluate((id) => { const ui = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { openGroup(c: string, g: string): void }> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('ui')!; const board = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board') as Store; ui.openGroup(board.snapshot.groups.find((g) => g.id === id)!.columnId, id) }, a2)
    await expect(panels(page)).toHaveCount(2)
    await expect(panelOf(page, 0).getByTestId('group-title')).toHaveAttribute('placeholder', /Flaky/)

    // Escape closes the focused panel only and gives focus back to its stack.
    await panelOf(page, 1).getByTestId('group-title').focus()
    await page.keyboard.press('Escape')
    await expect(panels(page)).toHaveCount(1)
    const left = await page.evaluate(() => [...document.querySelectorAll('[data-testid=group-panel]')].map((p) => p.closest('section[data-testid^=column-]')?.getAttribute('data-testid')))
    await expect(panelOf(page, 0), JSON.stringify(left)).toBeVisible()
    await expect(stack(page, b1)).toBeFocused()
  })

  test('dissolved closes its panel, merge opens the target, move keeps the panel in the new column', async ({ page }) => {
    const { a1, a2, b1 } = await twoColumns(page)
    await stack(page, a1).click()
    await stack(page, b1).click()
    await expect(panels(page)).toHaveCount(2)

    // Dissolve in column 2 closes only that panel.
    await page.getByTestId('group-dissolve').nth(1).click()
    await expect(panels(page)).toHaveCount(1)
    await expect(panelOf(page, 0)).toBeVisible()

    // Merge in column 1: the target opens.
    await page.getByTestId('cluster-merge').click()
    await page.getByTestId(`merge-into-${a2}`).click()
    await expect(panels(page)).toHaveCount(1)
    await expect(panelOf(page, 0).getByTestId('group-title')).toHaveAttribute('placeholder', /Flaky|Slow/)
  })

  test('a moved group stays open in its new column', async ({ page }) => {
    const { a1, b1 } = await twoColumns(page)
    await stack(page, a1).click()
    await expect(panelOf(page, 0)).toBeVisible()
    const target = await (await boardStore(page)).evaluate((s) => s.columns[2]!.id)
    await page.getByTestId('cluster-move').click()
    await page.getByTestId(`move-group-to-${target}`).click()
    await expect(panels(page)).toHaveCount(1)
    await expect(panelOf(page, 2)).toBeVisible()
    await expect(stack(page, b1)).toBeVisible()
  })

  test('opening groups is personal: nothing reaches another participant', async ({ page, browser }) => {
    const { a1, b1 } = await twoColumns(page)
    const bob = await join(browser, page.url(), 'Bob')
    await stack(page, a1).click()
    await stack(page, b1).click()
    await expect(panels(page)).toHaveCount(2)
    await expect(bob.page.getByTestId('group-panel')).toHaveCount(0)
    await bob.ctx.close()
  })
})

test('phone: an open group is still there after swiping, and the tab shows it', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const a = await groupIn(page, 0, 'Phone A')
  await page.getByTestId('col-tab-1').click()
  const b = await groupIn(page, 1, 'Phone B')
  await page.getByTestId('col-tab-0').click()
  await stack(page, a).click()
  await expect(panels(page)).toHaveCount(1)
  await expect(page.getByTestId('col-tab-open-0')).toBeVisible()
  await expect(page.getByTestId('col-tab-open-1')).toHaveCount(0)
  await page.getByTestId('col-tab-1').click()
  await stack(page, b).click()
  await expect(panels(page)).toHaveCount(2)
  await expect(page.getByTestId('col-tab-open-1')).toBeVisible()
  await page.getByTestId('col-tab-0').click()
  await expect(page.locator('section[data-testid^="column-"]').nth(0).getByTestId('group-panel')).toBeVisible()
  // The menu is a bottom sheet here.
  await page.getByTestId('group-close').first().click()
  await expect(page.getByTestId('col-tab-open-0')).toHaveCount(0)
  await menuOf(page, a).click()
  await expect(page.getByTestId(`gmenu-open-${a}`)).toBeVisible()
  const scan = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(scan.violations.map((v) => v.id)).toEqual([])
})

test('TV: two panels side by side, each inside its own column', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 })
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const a = await groupIn(page, 0, 'Wall A')
  const b = await groupIn(page, 1, 'Wall B')
  await stack(page, a).click()
  await stack(page, b).click()
  await expect(panels(page)).toHaveCount(2)
  const boxes = await Promise.all([0, 1].map(async (i) => {
    const col = page.locator('section[data-testid^="column-"]').nth(i)
    const [c, p] = await Promise.all([col.boundingBox(), col.getByTestId('group-panel').boundingBox()]) as [NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>, NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>]
    return { c, p }
  }))
  for (const { c, p } of boxes) {
    expect(p.x).toBeGreaterThanOrEqual(c.x - 1)
    expect(p.x + p.width).toBeLessThanOrEqual(c.x + c.width + 1)
  }
  expect(boxes[0]!.p.x + boxes[0]!.p.width).toBeLessThanOrEqual(boxes[1]!.p.x + 1)
  const scan = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(scan.violations.map((v) => v.id)).toEqual([])
})
