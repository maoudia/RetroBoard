import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, publishNote, settle } from './helpers'

/** Target: WCAG 2.2 AA (ADR-0022). Every impact fails the build, not only serious and critical. */
async function audit(page: Page) {
  await settle(page) // contrast on settled frames: a transition in flight blends colours
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  return result.violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) - ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
}

/** Every page and dialog is audited in light and in dark (the personal variant, the board theme stays imposed). */
for (const scheme of ['light', 'dark'] as const) test.describe(`accessibility (axe, ${scheme})`, () => {
  // Contrast is measured on settled frames: mid-animation opacity is transient, not a violation.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await page.addInitScript((variant) => {
      try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant })) } catch { /* ignore */ }
    }, scheme)
  })

  test('landing page', async ({ page }) => {
    await page.goto('/')
    await page.mouse.wheel(0, 6000)
    await page.waitForTimeout(1200)
    expect(await audit(page)).toEqual([])
  })

  test('service pages: 404, offline, unsupported, invalid link', async ({ page }) => {
    for (const path of ['/nope-nope', '/offline', '/unsupported', '/board#x']) {
      await page.goto(path)
      await page.waitForTimeout(300)
      expect(await audit(page), path).toEqual([])
    }
  })

  test('palette sheet from the note menu', async ({ page }) => {
    await createBoard(page)
    await publishNote(page, 0, 'Couleur')
    const note = page.locator('article.note', { hasText: 'Couleur' })
    const id = (await note.getAttribute('data-testid'))!.replace('note-', '')
    // The hover swatches are gone (composer-and-colour-v3): the note menu opens the palette sheet everywhere.
    await note.hover()
    await page.getByTestId(`note-menu-${id}`).click()
    await page.getByTestId(`palette-open-${id}`).click()
    await expect(page.getByTestId('palette')).toBeVisible()
    await page.waitForTimeout(500)
    expect(await audit(page)).toEqual([])
  })

  test('reveal countdown and the rename dialog', async ({ page, browser, isMobile }) => {
    test.skip(isMobile, 'facilitator menus are covered on desktop')
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    await page.getByTestId('btn-share').click()
    const url = await page.getByTestId('share-url').inputValue()
    await page.keyboard.press('Escape')
    const bob = await join(browser, url, 'Bob')
    await page.getByTestId('btn-participants').click()
    await page.getByTestId('peers').locator('li', { hasText: 'Bob' }).getByTestId('role-rename').click()
    await expect(page.getByTestId('rename-input')).toBeVisible()
    expect(await audit(page)).toEqual([])
    await page.keyboard.press('Escape')
    await page.getByTestId('reveal-all').click()
    await expect(page.getByTestId('reveal-countdown')).toBeVisible()
    expect(await audit(page)).toEqual([])
    await bob.ctx.close()
  })

  test('legal, privacy, terms and accessibility pages', async ({ page }) => {
    for (const path of ['/legal', '/privacy', '/terms', '/accessibility']) {
      await page.goto(path)
      await expect(page.locator('h1')).toBeVisible()
      expect(await audit(page)).toEqual([])
    }
  })

  test('retro report dialog', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Report me')
    await page.getByTestId('btn-export').click()
    await page.getByTestId('export-report').click()
    await expect(page.getByTestId('report')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('board creation page', async ({ page }) => {
    await page.goto('/new')
    await expect(page.getByTestId('setup-form')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('board with notes and the profile dialog', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Accessible note')
    expect(await audit(page)).toEqual([])
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('one-facilitator share panel with the facilitator link card, and the participants list', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue', oneFacilitator: true })
    await page.getByTestId('btn-share').click()
    await expect(page.getByTestId('share-facilitator-card')).toBeVisible()
    expect(await audit(page)).toEqual([])
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-participants').click()
    await expect(page.getByTestId('badge-facilitator')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('actions drawer with the owner combobox open, and the results dialog', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Ranked idea')
    await page.getByTestId('btn-actions').click()
    await page.getByTestId('action-text').fill('Audit me')
    await page.getByTestId('owner-input').fill('Ca')
    await expect(page.getByTestId('owner-options')).toBeVisible()
    expect(await audit(page)).toEqual([])
    await page.getByTestId('owner-input').press('Escape')
    await page.keyboard.press('Escape')
    await page.getByTestId('close-voting').click()
    await page.getByTestId('open-ranking').click()
    await expect(page.getByTestId('ranking-list')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('results page with charts has no axe violation', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Chart me')
    await page.locator('[data-testid^="vote-"]').first().click()
    await page.getByTestId('close-voting').click()
    await page.getByTestId('open-ranking').click()
    await expect(page.getByTestId('vote-charts')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('report dialog with the ROTI vote has no axe violation', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await page.getByTestId('btn-export').click()
    await page.getByTestId('export-report').click()
    await page.getByTestId('roti-4').click()
    await expect(page.getByTestId('report-roti')).toBeVisible()
    expect(await audit(page)).toEqual([])
  })

  test('static service pages: maintenance and busy', async ({ page }) => {
    for (const path of ['/maintenance', '/busy']) {
      await page.goto(path)
      await page.waitForTimeout(300)
      expect(await audit(page), path).toEqual([])
    }
  })

  test('options, export hub, keyboard help and the destroy confirmation', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Dialogs')
    await page.getByTestId('btn-options').click()
    await expect(page.getByTestId('opt-open-facilitation')).toBeVisible()
    expect(await audit(page), 'options').toEqual([])
    await page.keyboard.press('Escape')

    await page.getByTestId('btn-export').click()
    await expect(page.getByTestId('export-report')).toBeVisible()
    expect(await audit(page), 'export').toEqual([])
    await page.getByTestId('export-destroy').click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    expect(await audit(page), 'destroy').toEqual([])
    await page.keyboard.press('Escape')

    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog').last()).toBeVisible()
    expect(await audit(page), 'help').toEqual([])
  })

  test('column editor, filter bar and the agenda panel', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Panels')
    await page.getByTestId('add-column').click()
    await expect(page.getByRole('dialog').last()).toBeVisible()
    expect(await audit(page), 'column editor').toEqual([])
    await page.keyboard.press('Escape')

    await page.getByTestId('btn-filter').click()
    await expect(page.getByTestId('board-filter')).toBeVisible()
    expect(await audit(page), 'filter').toEqual([])
    await page.getByTestId('filter-close').click()

    await page.getByTestId('agenda-ring').click()
    await expect(page.getByTestId('agenda-panel')).toBeVisible()
    expect(await audit(page), 'agenda panel').toEqual([])
  })
})

/** A phone-sized viewport on every local run (the CI "phone" project adds the real device profile). */
for (const scheme of ['light', 'dark'] as const) test.describe(`accessibility (axe, phone, ${scheme})`, () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await page.addInitScript((variant) => {
      try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant })) } catch { /* ignore */ }
    }, scheme)
  })

  test('landing, creation and legal pages', async ({ page }) => {
    for (const path of ['/', '/new', '/legal']) {
      await page.goto(path)
      await page.waitForTimeout(400)
      expect(await audit(page), path).toEqual([])
    }
  })

  test('board with a note, the actions panel and the profile dialog', async ({ page }) => {
    await createBoard(page, { theme: 'studio', template: 'start-stop-continue' })
    await publishNote(page, 0, 'Phone note')
    expect(await audit(page), 'board').toEqual([])
    await page.getByTestId('btn-actions').click()
    await expect(page.getByTestId('action-text')).toBeVisible()
    expect(await audit(page), 'actions').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByTestId('btn-profile').click()
    await expect(page.getByTestId('profile-name')).toBeVisible()
    expect(await audit(page), 'profile').toEqual([])
  })
})
