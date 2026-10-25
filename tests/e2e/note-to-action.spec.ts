import AxeBuilder from '@axe-core/playwright'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createBoard, enterName, join, noteByText, publishNote } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
async function joinAnonymously(browser: Browser, url: string, name: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(url)
  await enterName(page, name, false)
  await expect(page.getByTestId('board')).toBeVisible()
  return { page, ctx }
}
async function menuOf(page: Page, text: string) {
  const note = noteByText(page, text)
  await note.hover()
  await note.locator('[data-testid^="note-menu-"]').click()
}

test.describe('create an action from a note', () => {
  test('the form is prefilled with the text and the shown author; the owner can be changed', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await publishNote(bob.page, 0, 'Release notes are late')
    await expect(noteByText(page, 'Release notes are late')).toBeVisible()

    await menuOf(page, 'Release notes are late')
    await page.locator('[data-testid^="create-action-"]').click()
    await expect(page.getByTestId('action-text')).toHaveValue('Release notes are late')
    await expect(page.getByTestId('owner-input')).toHaveValue('Bob')
    await expect(page.getByTestId('action-source')).toContainText('Release notes are late')
    // Nothing exists until "Add" is pressed.
    await expect(page.getByTestId('actions')).toHaveCount(0)

    await page.getByTestId('owner-input').fill('Alice')
    await page.getByTestId('action-add').click()
    const created = page.locator('[data-testid^="action-"][data-status]').filter({ hasText: 'Release notes are late' })
    await expect(created).toContainText('Alice')
    await expect(bob.page.getByTestId('btn-actions')).toBeVisible()
    await bob.ctx.close()
  })

  test('an anonymous note leaves the owner empty; the source can be detached', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const carl = await joinAnonymously(browser, await shareLink(page), 'Carl')
    await publishNote(carl.page, 0, 'Secret idea')
    await expect(noteByText(page, 'Secret idea')).toBeVisible()
    await menuOf(page, 'Secret idea')
    await page.locator('[data-testid^="create-action-"]').click()
    await expect(page.getByTestId('action-text')).toHaveValue('Secret idea')
    await expect(page.getByTestId('owner-input')).toHaveValue('')
    await page.getByTestId('action-source-clear').click()
    await expect(page.getByTestId('action-source')).toHaveCount(0)
    await carl.ctx.close()
  })

  test('disabled with the reason for a participant while the agenda rules close actions', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await publishNote(page, 0, 'Too early')
    await page.evaluate(() => {
      const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }> } } } } }).__vue_app__
      const board = app.config.globalProperties.$pinia._s.get('board')!
      board.commands.setAgenda([{ kind: 'write', minutes: 5 }, { kind: 'actions', minutes: 5 }], { rules: true, autoPublish: false })
      board.commands.startAgenda()
    })
    await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await menuOf(bob.page, 'Too early')
    const item = bob.page.locator('[data-testid^="create-action-"]')
    await expect(item).toBeDisabled()
    await expect(item).toHaveAttribute('title', /Écriture/)
    await bob.ctx.close()
  })

  test('a group offers it too, with the group title', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'First idea')
    await publishNote(page, 0, 'Second idea')
    const first = noteByText(page, 'First idea')
    const second = noteByText(page, 'Second idea')
    await first.dragTo(second)
    await page.locator('[data-testid^="group-"]').first().click()
    await page.getByTestId('group-create-action').click()
    await expect(page.getByTestId('action-text')).not.toHaveValue('')
    await expect(page.getByTestId('action-source')).toBeVisible()
  })

  test('the badge shows on every screen and opens the actions; the action links back to the note', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await publishNote(page, 0, 'Fix the build')
    await publishNote(page, 1, 'Unrelated')
    await expect(noteByText(bob.page, 'Fix the build')).toBeVisible()

    await menuOf(page, 'Fix the build')
    await page.locator('[data-testid^="create-action-"]').click()
    await page.getByTestId('action-add').click()
    await page.keyboard.press('Escape')

    const badgeBob = noteByText(bob.page, 'Fix the build').locator('[data-testid^="action-badge-"]')
    await expect(badgeBob).toHaveText(/1 action/)
    await expect(noteByText(bob.page, 'Unrelated').locator('[data-testid^="action-badge-"]')).toHaveCount(0)
    expect((await new AxeBuilder({ page: bob.page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([])

    await badgeBob.click()
    await expect(bob.page.getByTestId('action-text')).toBeVisible()
    await expect(bob.page.locator('li.hl')).toContainText('Fix the build')
    await bob.page.locator('[data-testid^="action-from-"]').click()
    await expect(bob.page.getByTestId('action-text')).toBeHidden()
    await expect(noteByText(bob.page, 'Fix the build')).toBeFocused()

    // Deleting the idea drops the badge; the action stays without its link.
    await menuOf(page, 'Fix the build')
    await page.locator('[data-testid^="delete-"]').click()
    await expect(noteByText(bob.page, 'Fix the build')).toHaveCount(0)
    await bob.page.getByTestId('btn-actions').click()
    await expect(bob.page.locator('[data-testid^="action-"][data-status]')).toContainText('Fix the build')
    await expect(bob.page.locator('[data-testid^="action-from-"]')).toHaveCount(0)
    await bob.ctx.close()
  })

  test('a group carries the badge too', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'One')
    await publishNote(page, 0, 'Two')
    await noteByText(page, 'One').dragTo(noteByText(page, 'Two'))
    await page.locator('[data-testid^="group-"]').first().click()
    await page.getByTestId('group-create-action').click()
    await page.getByTestId('action-add').click()
    await page.keyboard.press('Escape')
    const badge = page.locator('[data-testid^="action-badge-"]')
    await expect(badge.first()).toHaveText(/1 action/)
  })
})
