import { expect, test } from '@playwright/test'
import { axe, createBoard, join, noteByText, publishNote } from './helpers'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/** Change user-drive-storage, group 1: the board library of this browser. */

test('a created board is listed, reopens after a reload, can be archived and restored, and is forgotten after a confirmation', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Library retro' })
  await publishNote(page, 0, 'Kept in the browser')
  await page.goto('/boards')
  await expect(page.getByTestId('library-page')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  const row = page.locator('[data-testid^="library-row-"]').filter({ hasText: 'Library retro' })
  await expect(row).toBeVisible()
  await expect(row).toContainText(/Facilitateur|Facilitator/)
  await expect(row).toContainText(/à l'instant|il y a|just now|ago/)
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])

  // Reopen after a reload: the link is rebuilt from the sealed entry, the events come from the replica.
  await page.reload()
  await expect(row).toBeVisible()
  await row.getByRole('link', { name: /Library retro/ }).first().click()
  await expect(noteByText(page, 'Kept in the browser')).toBeVisible({ timeout: 15_000 })

  // Archive hides it from the main list and keeps it under "Archived".
  await page.goto('/boards')
  await row.getByTestId(/library-archive-/).click()
  await expect(row).toHaveCount(0)
  await page.getByTestId('library-archived').click()
  await expect(row).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await row.getByTestId(/library-archive-/).click()
  await page.getByTestId('library-active').click()
  await expect(row).toBeVisible()

  // Forget asks first; cancelling keeps it, confirming removes it for good.
  await row.getByTestId(/library-forget-/).click()
  await page.getByRole('button', { name: /Annuler|Cancel/ }).click()
  await expect(row).toBeVisible()
  await row.getByTestId(/library-forget-/).click()
  await page.getByTestId('confirm').click()
  await expect(row).toHaveCount(0)
  await expect(page.getByTestId('library-empty')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('library-empty')).toBeVisible()
})

test('a board protected by a passcode says so, and asks for the passcode when the device no longer remembers it', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Guarded retro', passcode: 'Bright-Falcon-42' })
  await page.goto('/boards')
  const row = page.locator('[data-testid^="library-row-"]').filter({ hasText: 'Guarded retro' })
  await expect(row).toContainText(/code d'accès|passcode/i)
  // The creator's device remembers the code (sealed); forget it the way another device would not have it.
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('retroboard-vault', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction('codes', 'readwrite')
      tx.objectStore('codes').clear()
      tx.oncomplete = () => { open.result.close(); resolve() }
    }
  }))
  await row.getByRole('link', { name: /Guarded retro/ }).first().click()
  await expect(page.getByTestId('passcode-input')).toBeVisible()
  await page.getByTestId('passcode-input').fill('Bright-Falcon-42')
  await page.getByTestId('passcode-submit').click()
  await expect(page.getByTestId('board')).toBeVisible({ timeout: 15_000 })
})

test('a board joined by link is not listed until "Save to my library"', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Shared retro', passcode: '', keepShare: true })
  const link = await page.getByTestId('share-url').inputValue()
  const bob = await join(browser, link, 'Bob')
  await bob.page.goto('/boards')
  await expect(bob.page.getByTestId('library-empty')).toBeVisible()
  await bob.page.goBack()
  await bob.page.getByTestId('btn-boards').click()
  await bob.page.getByTestId('boards-save').click()
  await expect(bob.page.getByText(/enregistré dans votre bibliothèque|saved to your library/i)).toBeVisible()
  await bob.page.getByTestId('btn-boards').click()
  await expect(bob.page.getByTestId('boards-saved')).toBeVisible()
  await expect(bob.page.getByTestId('boards-save')).toHaveCount(0)
  await bob.page.goto('/boards')
  const row = bob.page.locator('[data-testid^="library-row-"]').filter({ hasText: 'Shared retro' })
  await expect(row).toBeVisible()
  await expect(row).toContainText(/Participant/)
  await bob.ctx.close()
})

for (const scheme of ['light', 'dark'] as const) {
  test(`the library fits a phone and a TV without horizontal scroll and passes axe (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: scheme })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'A rather long retrospective title that must not push the actions off the screen' })
    for (const size of [{ width: 360, height: 740 }, { width: 2560, height: 1440 }]) {
      await page.setViewportSize(size)
      await page.goto('/boards')
      const row = page.locator('[data-testid^="library-row-"]').first()
      await expect(row).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      // Every action stays reachable, with a 44 px target on a phone.
      const archive = row.getByTestId(/library-archive-/)
      const box = await archive.boundingBox()
      expect(box && box.x >= 0 && box.x + box.width <= size.width).toBe(true)
      if (size.width < 600) expect(box!.height).toBeGreaterThanOrEqual(44)
      expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
    }
  })
}
