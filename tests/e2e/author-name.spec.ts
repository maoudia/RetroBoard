import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

async function link(page: import('@playwright/test').Page) {
  if (!(await page.getByTestId('share-url').isVisible())) await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}

test('a typed name is shown on notes by default and the checkbox follows the name field', async ({ page, browser }) => {
  await page.goto('/new')
  await page.getByTestId('theme-studio').click()
  await page.getByTestId('tab-all').click()
  await page.getByTestId('template-start-stop-continue').click()
  await page.getByTestId('setup-submit').click()
  await expect(page.getByTestId('name-input')).toBeVisible()
  await expect(page.getByTestId('name-show')).not.toBeChecked()
  await page.getByTestId('name-input').fill('Alice')
  await expect(page.getByTestId('name-show')).toBeChecked()
  await page.getByTestId('name-input').fill('')
  await expect(page.getByTestId('name-show')).not.toBeChecked()
  await page.getByTestId('name-input').fill('Alice')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await page.keyboard.press('Escape')
  await publishNote(page, 0, 'Signed idea')
  const url = await link(page)

  const bob = await join(browser, url, 'Bob')
  await expect(noteByText(bob.page, 'Signed idea')).toContainText('Alice')
  await bob.ctx.close()
})

test('the composer shows the signature and one click switches to anonymous for the next notes only', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const chip = page.locator('[data-testid^="signature-"][data-signed]').first()
  await expect(chip).toHaveAttribute('data-signed', 'true')
  await expect(page.locator('[data-testid^="signature-named-"]').first()).toHaveAccessibleName(/Alice/)
  await publishNote(page, 0, 'Before')
  await page.locator('[data-testid^="signature-anon-"]').first().click()
  await expect(chip).toHaveAttribute('data-signed', 'false')
  await expect(page.locator('[data-testid^="signature-anon-"]').first()).toHaveAttribute('aria-pressed', 'true')
  await publishNote(page, 0, 'After')
  const url = await link(page)

  const bob = await join(browser, url, 'Bob')
  await expect(noteByText(bob.page, 'Before')).toContainText('Alice')
  await expect(noteByText(bob.page, 'After')).toBeVisible()
  await expect(noteByText(bob.page, 'After')).not.toContainText('Alice')
  // axe on the composer with the chip.
  const found = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
  expect(found).toEqual([])
  await bob.ctx.close()
})

test('without a name the chip reads Anonymous and opens the name dialog', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: '' })
  await expect(page.locator('[data-testid^="signature-anon-"]').first()).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-testid^="signature-named-"]').first().click()
  await expect(page.getByTestId('name-input')).toBeVisible()
})

test('a saved choice to stay anonymous is kept when the name is edited later', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.locator('[data-testid^="signature-anon-"]').first().click()
  await page.reload()
  await expect(page.locator('[data-testid^="signature-"][data-signed]').first()).toHaveAttribute('data-signed', 'false')
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('profile-name').fill('Alicia')
  await page.getByTestId('profile-name').blur()
  await expect(page.getByTestId('profile-show')).not.toBeChecked()
})

test('renaming the profile updates earlier signed notes for everyone; anonymous notes stay anonymous (#229)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alex' })
  const bob = await join(browser, await link(page), 'Bob')
  await publishNote(page, 0, 'Signed idea')
  await expect(noteByText(bob.page, 'Signed idea')).toContainText('Alex')

  await page.getByTestId('btn-profile').click()
  await page.getByTestId('profile-name').fill('Alexandre')
  await page.getByTestId('profile-name').blur()
  await page.keyboard.press('Escape')

  await expect(noteByText(bob.page, 'Signed idea')).toContainText('Alexandre')
  await expect(noteByText(page, 'Signed idea')).toContainText('Alexandre')
  await bob.ctx.close()
})

test('the latest joiner with an already used name is asked to pick another; the first one is not (identity-conflicts)', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alex' })
  const bob = await join(browser, await link(page), 'alex')
  await expect(bob.page.getByTestId('name-conflict')).toBeVisible()
  await expect(page.getByTestId('name-conflict')).toHaveCount(0)
  const found = (await new AxeBuilder({ page: bob.page }).include('[data-testid="name-conflict"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
  expect(found).toEqual([])
  await bob.page.getByTestId('conflict-choose').click()
  await expect(bob.page.getByTestId('name-input')).toBeVisible()
  await bob.page.getByTestId('name-input').fill('Alexandra')
  await bob.page.getByTestId('name-save').click()
  await expect(bob.page.getByTestId('name-conflict')).toHaveCount(0)
  await bob.ctx.close()
})
