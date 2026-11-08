import { expect, test } from '@playwright/test'
import { axe, createBoard, settle } from './helpers'

// Change user-manual-and-tutorials: the guide is reachable from the landing page, the Help dialog and the contextual
// panels, in the language of the app, and none of these links breaks the accessibility checks.
const LOCALES = [{ code: 'fr', tag: 'fr-FR', label: /Guide d.utilisation/ }, { code: 'en', tag: 'en-US', label: /User guide/ }] as const

for (const l of LOCALES) {
  test.describe(l.code, () => {
    test.use({ locale: l.tag, storageState: { cookies: [], origins: [] } })

    test(`the landing page has the guide badge and footer link in ${l.code}`, async ({ page }) => {
      await page.goto('/')
      const badge = page.getByTestId('landing-guide')
      await expect(badge).toBeVisible()
      await expect(badge).toHaveAttribute('href', `/guide/${l.code}/`)
      await expect(page.getByTestId('link-guide')).toHaveAttribute('href', `/guide/${l.code}/`)
      await expect(page.getByTestId('link-guide')).toContainText(l.label)
      await settle(page)
      expect((await axe(page).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map((v) => v.id)).toEqual([])
    })
  })
}

test('the Help dialog opens the guide in the current language in a new tab, and the panels link to their chapter', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('?')
  const help = page.getByRole('dialog')
  const link = help.getByTestId('guide-link-home')
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', '/guide/fr/')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await settle(page)
  expect((await axe(page).include('dialog[open]').withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map((v) => v.id)).toEqual([])
  const popup = page.waitForEvent('popup')
  await link.click()
  expect((await popup).url()).toMatch(/\/guide\/fr\/?$/)
  await page.keyboard.press('Escape')

  await page.getByTestId('btn-share').click()
  await expect(page.getByTestId('guide-link-invite')).toHaveAttribute('href', '/guide/fr/invite.html#share')
  await page.keyboard.press('Escape')

  await page.getByTestId('btn-options').click()
  await expect(page.getByTestId('guide-link-options')).toHaveAttribute('href', '/guide/fr/options.html#options')
  await page.keyboard.press('Escape')

  await page.getByTestId('agenda-ring').click()
  await expect(page.getByTestId('guide-link-agenda')).toHaveAttribute('href', '/guide/fr/agenda.html#panel')
})
