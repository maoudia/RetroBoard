import { expect, test } from '@playwright/test'
import { collectProblems, column, createBoard, join, noteByText, publishNote } from './helpers'

test.describe('board lifecycle', () => {
  test('creates a themed board from a template', async ({ page }) => {
    await createBoard(page, { theme: 'noel', template: 'noel', title: 'Rétro de Noël' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'noel')
    await expect(page.getByTestId('board-title')).toContainText('Rétro de Noël')
    await expect(page.getByTestId('column-title')).toHaveText(['Cadeaux reçus', 'Morceaux de charbon', 'Liste au Père Noël', 'Merci les lutins'])
  })

  test('private drafts stay private until published, then sync live', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const { page: bob } = await join(browser, page.url(), 'Bob')
    await expect(page.getByTestId('peer-count')).toHaveText('2')

    await column(page, 0).locator('textarea').fill('Plus de pair programming')
    await column(page, 0).locator('textarea').press('Enter')
    await expect(noteByText(bob, 'Plus de pair programming')).toHaveCount(0)

    await column(page, 0).locator('[data-testid^="publish-"]').click()
    await expect(noteByText(bob, 'Plus de pair programming')).toBeVisible()
    await expect(noteByText(page, 'Plus de pair programming')).toContainText('Alice')
  })

  test('survives a reload with the same board and drafts', async ({ page }) => {
    await createBoard(page, { template: 'weather' })
    await publishNote(page, 0, 'Persistant')
    await column(page, 1).locator('textarea').fill('Brouillon local')
    await column(page, 1).locator('textarea').press('Enter')
    await page.reload()
    await expect(noteByText(page, 'Persistant')).toBeVisible()
    await expect(page.getByText('Brouillon local')).toBeVisible()
  })
})

test.describe('voting', () => {
  test('enforces the vote limit and supports secret voting', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    for (const t of ['a', 'b', 'c', 'd']) await publishNote(page, 0, `note ${t}`)
    const { page: bob } = await join(browser, page.url(), 'Bob')

    for (const t of ['a', 'b', 'c']) await noteByText(bob, `note ${t}`).locator('.vote').click()
    await expect(bob.getByTestId('votes-left')).toContainText('0')
    await noteByText(bob, 'note d').locator('.vote').click()
    await expect(bob.getByText('Tu as utilisé tous tes votes.')).toBeVisible()
    await expect(noteByText(page, 'note a').locator('.vote .n')).toHaveText('1')

    await page.getByTestId('secret-toggle').click()
    await expect(noteByText(page, 'note a').locator('.vote .n')).toHaveCount(0)
    await expect(noteByText(bob, 'note a').locator('.vote .n')).toHaveCount(0)
    await expect(noteByText(bob, 'note a').locator('.vote')).toHaveAttribute('aria-pressed', 'true')
  })

  test('sorting a column by votes reorders its notes', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'first')
    await publishNote(page, 0, 'second')
    await noteByText(page, 'second').locator('.vote').click()
    await column(page, 0).getByRole('button', { name: 'Trier par votes' }).click()
    await expect(column(page, 0).locator('article.note .text').first()).toHaveText('second')
  })
})

test.describe('groups', () => {
  test('drag a note onto another to stack them, open, rename and ungroup', async ({ page }) => {
    await createBoard(page, { template: 'weather' })
    await publishNote(page, 0, 'Cohésion')
    await publishNote(page, 0, 'Entente')
    await noteByText(page, 'Entente').dragTo(noteByText(page, 'Cohésion'))

    const stack = page.locator('[data-testid^="group-"]:not([data-testid="group-panel"]):not([data-testid="group-title"]):not([data-testid="group-close"]):not([data-testid="group-dissolve"])').first()
    await expect(stack).toBeVisible()
    await expect(stack).toContainText('2')

    await stack.click()
    const panel = page.getByTestId('group-panel')
    await expect(panel).toBeVisible()
    await expect(panel.locator('article.note')).toHaveCount(2)
    await panel.getByTestId('group-title').fill('Esprit d\'équipe')
    await panel.getByTestId('group-title').press('Enter')
    await page.getByTestId('group-close').click()
    await expect(stack).toContainText('Esprit d\'équipe')

    await stack.click()
    await page.getByTestId('group-dissolve').click()
    await expect(page.getByTestId('group-panel')).toHaveCount(0)
    await expect(column(page, 0).locator('article.note')).toHaveCount(2)
  })

  test('removing a note from a pair dissolves the group', async ({ page }) => {
    await createBoard(page, { template: 'weather' })
    await publishNote(page, 0, 'Un')
    await publishNote(page, 0, 'Deux')
    await noteByText(page, 'Deux').dragTo(noteByText(page, 'Un'))
    await page.locator('[data-testid^="group-"]').filter({ hasText: '2' }).first().click()
    const inner = page.getByTestId('group-panel').locator('article.note').first()
    // The panel animates in; retry the menu click until the popover stays open.
    await expect(async () => {
      await inner.locator('[data-testid^="note-menu-"]').click()
      await expect(page.locator('[data-testid^="ungroup-"]')).toBeVisible({ timeout: 1500 })
    }).toPass({ timeout: 15_000 })
    await page.locator('[data-testid^="ungroup-"]').click()
    await expect(page.getByTestId('group-panel')).toHaveCount(0)
    await expect(column(page, 0).locator('article.note')).toHaveCount(2)
  })
})

test.describe('columns', () => {
  test('rename, add, reorder and delete columns for everybody', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const { page: bob } = await join(browser, page.url(), 'Bob')

    await page.locator('[data-testid^="col-menu-"]').first().click()
    await page.getByTestId('col-rename').click()
    await page.getByTestId('col-title').fill('Démarrer')
    await page.getByTestId('col-save').click()
    await expect(bob.getByTestId('column-title').first()).toHaveText('Démarrer')

    await page.getByTestId('add-column').click()
    await page.getByTestId('col-title').fill('Questions')
    await page.getByTestId('col-subtitle').fill('Ce qu\'on voudrait comprendre')
    await page.getByTestId('col-save').click()
    await expect(bob.getByTestId('column-title')).toHaveText(['Démarrer', 'Stop', 'Continue', 'Questions'])

    await publishNote(page, 3, 'Pourquoi ?')
    await page.locator('[data-testid^="col-menu-"]').nth(3).click()
    await page.getByRole('menuitem', { name: 'Déplacer à gauche' }).click()
    await expect(bob.getByTestId('column-title').nth(2)).toHaveText('Questions')

    await page.locator('[data-testid^="col-menu-"]').nth(2).click()
    await page.getByTestId('col-delete').click()
    await expect(page.getByText('« Questions » et son 1 post-it')).toBeVisible()
    await page.getByTestId('confirm').click()
    await expect(bob.getByTestId('column-title')).toHaveText(['Démarrer', 'Stop', 'Continue'])
    await expect(noteByText(bob, 'Pourquoi ?')).toHaveCount(0)
  })

  test('moving a note between columns (drag and drop, or the note menu on touch screens)', async ({ page }, info) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Déplaçable')
    if (info.project.use.hasTouch) {
      // HTML drag and drop needs a mouse; touch users move notes from the note menu.
      await noteByText(page, 'Déplaçable').locator('[data-testid^="note-menu-"]').click()
      await page.getByRole('menuitem', { name: 'Continue' }).click()
    } else {
      await noteByText(page, 'Déplaçable').dragTo(column(page, 2))
    }
    await expect(column(page, 2).locator('article.note', { hasText: 'Déplaçable' })).toBeVisible()
    await expect(column(page, 0).locator('article.note')).toHaveCount(0)
  })
})

test.describe('retro suggestions', () => {
  test('recommends a format from the team situation', async ({ page }) => {
    await page.goto('/new')
    await page.getByRole('button', { name: /Apaiser les tensions/ }).click()
    await page.getByRole('button', { name: '1', exact: true }).click()
    await page.getByTestId('setup-form').getByRole('button', { name: '45 min' }).click()
    const first = page.getByTestId('suggestions').locator('li').first()
    await expect(first).toContainText('Mad / Sad / Glad')
    await expect(first).toContainText('Meilleur choix')
  })

  test('changing the format on a board with notes asks before wiping', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Sera effacé')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-template').click()
    await page.getByTestId('tab-all').click()
    await page.getByTestId('template-sailboat').click()
    await page.getByTestId('template-apply').click()
    await page.getByTestId('confirm').click()
    await expect(page.getByTestId('column-title')).toHaveText(['Vent', 'Ancres', 'Rochers', 'Île'])
    await expect(noteByText(page, 'Sera effacé')).toHaveCount(0)
  })
})

test.describe('themes and options', () => {
  test('the board theme is shared with every participant', async ({ page, browser }) => {
    await createBoard(page, { theme: 'cyber', template: 'start-stop-continue' })
    const { page: bob } = await join(browser, page.url(), 'Bob')
    await expect(bob.locator('html')).toHaveAttribute('data-theme', 'cyber')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('theme-sakura').click()
    await expect(bob.locator('html')).toHaveAttribute('data-theme', 'sakura')
    await expect(bob.locator('html')).toHaveAttribute('data-enter', 'bloom')
  })

  test('locking blocks new notes, reset wipes the board', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await publishNote(page, 0, 'Avant')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-lock').check()
    await page.keyboard.press('Escape')
    await expect(column(page, 0).locator('textarea')).toBeDisabled()
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-lock').uncheck()
    await page.getByTestId('opt-reset').click()
    await page.getByTestId('confirm').click()
    await expect(noteByText(page, 'Avant')).toHaveCount(0)
  })

  test('actions plan is shared and exports are available', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    const { page: bob } = await join(browser, page.url(), 'Bob')
    await page.getByTestId('btn-actions').click()
    await page.getByTestId('action-text').fill('Documenter le rollback')
    await page.getByTestId('action-add').click()
    await expect(bob.getByTestId('actions-count')).toHaveText('1')

    await page.keyboard.press('Escape')
    await publishNote(page, 0, 'À exporter')
    const [download] = await Promise.all([page.waitForEvent('download'), (async () => {
      await page.getByTestId('btn-export').click()
      await page.getByTestId('export-md').click()
    })()])
    expect(download.suggestedFilename()).toMatch(/\.md$/)
  })
})

test('solo mode works fully in the browser', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('solo').click()
  await page.getByTestId('name-input').fill('Solo')
  await page.getByTestId('name-save').click()
  await expect(page.getByTestId('board')).toBeVisible()
  await publishNote(page, 0, 'Local')
  await expect(noteByText(page, 'Local')).toBeVisible()
})

test('invalid links are explained', async ({ page }) => {
  await page.goto('/board#nope')
  await expect(page.getByRole('heading', { name: 'Lien invalide' })).toBeVisible()
})

test('no CSP violation or console error across the main flows', async ({ page }) => {
  const problems = await collectProblems(page)
  await createBoard(page, { template: 'weather' })
  await publishNote(page, 0, 'CSP')
  await page.getByTestId('btn-options').click()
  await page.getByTestId('theme-minimal').click()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-actions').click()
  expect(problems).toEqual([])
})
