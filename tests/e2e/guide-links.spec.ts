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

// Change a11y-gate-and-derived-contrast: the landing demo notes fade in and out forever, and the nightly caught one mid-fade
// (text #69696a on #fcdff0, 4.4:1, when the resting colour is #1d1d1f). The audit must measure the resting state.
test('the axe audit measures the landing demo notes at rest, not frozen mid-fade', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit runs with reduced motion here, so the demo notes do not animate and there is nothing to freeze')
  await page.goto('/')
  await expect(page.getByTestId('landing-guide')).toBeVisible()
  await settle(page)
  const frozen = await page.evaluate(() => {
    const notes = document.getAnimations().filter((a) => (a as CSSAnimation).animationName?.startsWith('cycle'))
    // 140 ms into the entrance of each note: opacity is about a third, the text is blended into the paper.
    for (const a of notes) { a.pause(); a.currentTime = Number((a.effect as KeyframeEffect).getTiming().delay) + 140 }
    return notes.length
  })
  expect(frozen).toBeGreaterThan(0)
  expect((await axe(page).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map((v) => v.id)).toEqual([])
})

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
