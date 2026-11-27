import { expect, test } from '@playwright/test'

// The product walkthrough of the landing (change landing-v2-and-product-video, task 1.2).
const CAPTIONS = {
  fr: ['Choisis un format et un thème.', "Un lien, et l'équipe est là.", "Écris en privé, publie d'un clic.", 'Glisse un post-it pour regrouper.', 'Vote avec un nombre limité de points.', 'Les idées gagnantes montent au podium.', "Décide des actions, exporte le compte rendu."],
  en: ['Pick a format and a theme.', 'One link and the team is in.', 'Write in private, publish in one click.', 'Drop a note to group.', 'Vote with a limited number of dots.', 'The winning ideas climb the podium.', 'Decide the actions, export the summary.'],
}

test.describe('motion', () => {
  test.use({ locale: 'en-US', reducedMotion: 'no-preference' })
  test('the walkthrough plays seven captioned scenes, pauses and jumps (en)', async ({ page }) => {
  await page.goto('/')
  const wt = page.getByTestId('walkthrough')
  await wt.scrollIntoViewIfNeeded()
  await expect(wt).toHaveAttribute('data-scene', '0')
  await expect(page.getByTestId('wt-scene-1')).toBeVisible()
  await expect(page.getByTestId('wt-scene-2')).toBeHidden()
  // The loop moves on by itself (the scene lasts six seconds).
  await expect(wt).toHaveAttribute('data-scene', '1', { timeout: 9000 })
  // Pause stops it; a jump shows the scene asked for with its caption.
  const toggle = page.getByTestId('wt-toggle')
  await expect(toggle).toHaveAccessibleName('Pause')
  await toggle.click()
  await expect(toggle).toHaveAccessibleName('Play')
  await page.getByTestId('wt-pip-5').click()
  await expect(wt).toHaveAttribute('data-scene', '4')
  await expect(page.getByTestId('wt-scene-5')).toContainText('Vote with a limited number of dots.')
  await page.waitForTimeout(6500)
  await expect(wt).toHaveAttribute('data-scene', '4')
  // The caption is announced only once the visitor pressed play.
  await expect(wt.locator('.screen')).toHaveAttribute('aria-live', 'off')
  await toggle.click()
  await expect(wt.locator('.screen')).toHaveAttribute('aria-live', 'polite')
  })
})

for (const lang of ['fr', 'en'] as const) test.describe(`reduced ${lang}`, () => {
  test.use({ locale: lang === 'fr' ? 'fr-FR' : 'en-US', reducedMotion: 'reduce' })
  test(`with reduced motion the walkthrough is a static captioned storyboard (${lang})`, async ({ page }) => {
    await page.goto('/')
    const wt = page.getByTestId('walkthrough')
    await wt.scrollIntoViewIfNeeded()
    for (let n = 1; n <= 7; n++) {
      const scene = page.getByTestId(`wt-scene-${n}`)
      await expect(scene).toBeVisible()
      await expect(scene.locator('figcaption')).toHaveText(CAPTIONS[lang][n - 1]!)
    }
    await expect(page.getByTestId('wt-toggle')).toBeHidden()
    await expect(wt).toHaveAttribute('data-scene', '0')
    await page.waitForTimeout(6500)
    await expect(wt).toHaveAttribute('data-scene', '0')
  })
})

test('the walkthrough is served without inline style and fits a 360 px phone with the pseudo-locale', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  const block = html.slice(html.indexOf('data-testid="walkthrough"'), html.indexOf('data-testid="walkthrough"') + 6000)
  expect(block).toContain('wt-scene-7')
  expect(block).not.toMatch(/\sstyle="/)
  await page.setViewportSize({ width: 360, height: 740 })
  for (const lang of ['en', 'pseudo']) {
    await page.goto(lang === 'pseudo' ? '/?lang=pseudo' : '/')
    const wt = page.getByTestId('walkthrough')
    await wt.scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), lang).toBeLessThanOrEqual(0)
    const cap = page.getByTestId('wt-scene-1').locator('figcaption')
    expect(await cap.evaluate((el) => el.scrollWidth - el.clientWidth), lang).toBeLessThanOrEqual(0)
  }
})
