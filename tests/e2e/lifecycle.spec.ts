import { expect, test } from '@playwright/test'
import { createBoard, join, noteByText, publishNote } from './helpers'

test('destroy: confirmed by title, closes the board for everyone, including a participant who was offline', async ({ page, browser }) => {
  await createBoard(page, { title: 'Sprint 42' })
  await publishNote(page, 0, 'À garder ?')
  const bob = await join(browser, page.url(), 'Bob')
  const carol = await join(browser, page.url(), 'Carol')
  await carol.ctx.setOffline(true)

  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-destroy').click()
  await expect(page.getByTestId('destroy-confirm')).toBeDisabled()
  await page.getByTestId('destroy-title').fill('Sprint 4')
  await expect(page.getByTestId('destroy-confirm')).toBeDisabled()
  await page.getByTestId('destroy-title').fill('sprint 42')
  await page.getByTestId('destroy-confirm').click()

  await expect(page.getByTestId('board-closed')).toBeVisible()
  await expect(bob.page.getByTestId('board-closed')).toBeVisible()
  // The tab that was offline learns it when it comes back.
  await carol.ctx.setOffline(false)
  await expect(carol.page.getByTestId('board-closed')).toBeVisible({ timeout: 30_000 })

  // Reopening the link on a device that knows the board is closed explains it, with no board behind.
  await bob.page.reload()
  await expect(bob.page.getByTestId('board-closed')).toBeVisible()
  await expect(bob.page.getByTestId('board')).toHaveCount(0)
  // The encrypted local copy is gone on every device that saw the closing.
  for (const who of [bob, carol]) {
    const stored = await who.page.evaluate((name) => new Promise<number>((resolve) => {
      const open = indexedDB.open(name)
      open.onerror = () => resolve(0)
      open.onsuccess = () => {
        const db = open.result
        if (!db.objectStoreNames.contains('envelopes')) return resolve(0)
        const count = db.transaction('envelopes').objectStore('envelopes').count()
        count.onsuccess = () => resolve(count.result)
        count.onerror = () => resolve(-1)
      }
    }), 'retroboard-replica')
    expect(stored).toBe(0)
  }
})

test('destroy is offered to the facilitator only, and after an export', async ({ page, browser }) => {
  await createBoard(page, { title: 'Export puis fermeture' })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')
  await bob.page.getByTestId('btn-options').click()
  await expect(bob.page.getByTestId('opt-destroy')).toHaveCount(0)
  await bob.ctx.close()

  await page.getByTestId('btn-options').click()
  await expect(page.getByTestId('opt-destroy')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-export').click()
  await expect(page.getByTestId('export-after')).toBeVisible()
  await page.getByTestId('export-destroy').click()
  await expect(page.getByTestId('destroy-title')).toBeVisible()
})

const panel = async (page: import('@playwright/test').Page, fn: () => Promise<void>) => {
  await page.getByTestId('agenda-ring').click()
  await expect(page.getByTestId('agenda-panel')).toBeVisible()
  await fn()
  await page.keyboard.press('Escape')
}

test('reset one column: others untouched, everyone is told', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, page.url(), 'Bob')
  await publishNote(page, 0, 'Dans la première')
  await publishNote(page, 1, 'Dans la seconde')
  await expect(noteByText(bob.page, 'Dans la seconde')).toBeVisible()

  await page.locator('[data-testid^="col-menu-"]').first().click()
  await page.locator('[data-testid^="col-reset-"]').first().click()
  await page.getByTestId('confirm').click()
  await expect(noteByText(page, 'Dans la première')).toHaveCount(0)
  await expect(noteByText(bob.page, 'Dans la première')).toHaveCount(0)
  await expect(noteByText(bob.page, 'Dans la seconde')).toBeVisible()
  await expect(bob.page.locator('[data-testid="toast"], .toast').filter({ hasText: /Alice.*vidé la colonne/ })).toBeVisible()
})

test('reset votes and clocks; step back to the previous phase', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  const bob = await join(browser, page.url(), 'Bob')
  await publishNote(page, 0, 'À voter')
  const vote = (p: typeof page) => noteByText(p, 'À voter').locator('[data-testid^="vote-"]')
  await vote(bob.page).click()
  await expect(noteByText(page, 'À voter')).toContainText('1')

  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-reset-votes').click()
  await page.getByTestId('confirm').click()
  await expect(bob.page.getByText(/Alice a remis les votes à zéro/)).toBeVisible()
  await expect(noteByText(bob.page, 'À voter')).not.toContainText('1')

  await panel(page, async () => {
    await page.getByTestId('agenda-start').click()
    await expect(page.getByTestId('agenda-prev')).toBeDisabled()
    await page.getByTestId('agenda-next').click()
    await expect(page.getByTestId('agenda-prev')).toBeEnabled()
    await page.getByTestId('agenda-prev').click()
  })
  await expect(page.getByTestId('agenda-phase')).toHaveText('Inclusion')
  await expect(bob.page.getByTestId('agenda-phase')).toHaveText('Inclusion')
  await expect(bob.page.getByText(/Alice est revenu à la phase précédente/)).toBeVisible()

  await page.getByTestId('btn-options').click()
  await page.getByTestId('opt-reset-clock').click()
  await page.getByTestId('confirm').click()
  await expect(bob.page.getByText(/Alice a remis les horloges à zéro/)).toBeVisible()
})
