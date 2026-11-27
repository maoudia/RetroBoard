import { expect, test } from '@playwright/test'
import { axe, createBoard, noteByText, publishNote } from './helpers'

// Note zoom (change note-zoom-on-double-tap): any participant enlarges a note locally, outside presentation mode.
test.describe('note zoom', () => {
  test('a double click zooms, arrows move, Escape closes and returns the focus to the note', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Pairing')
    await publishNote(page, 0, 'Code review')
    const note = noteByText(page, 'Pairing')

    await note.locator('[data-testid="note-text"]').click()
    await expect(page.getByTestId('zoom')).toHaveCount(0) // a single tap does nothing, and does not wait

    await note.locator('[data-testid="note-text"]').dblclick()
    const zoom = page.getByTestId('zoom')
    await expect(zoom).toBeVisible()
    await expect(zoom).toHaveAttribute('aria-modal', 'true')
    await expect(page.getByTestId('zoom-text')).toHaveText('Pairing')
    await expect(page.getByTestId('zoom-prev')).toBeDisabled()
    const found = (await axe(page).include('[data-testid="zoom"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])

    await page.keyboard.press('ArrowRight')
    await expect(page.getByTestId('zoom-text')).toHaveText('Code review')
    await expect(page.getByTestId('zoom-next')).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(zoom).toHaveCount(0)
    await expect(page.getByTestId('spotlight')).toHaveCount(0)
  })

  test('the 3-dot menu item and the z key open it, z inside a field does not', async ({ page, isMobile }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Retros are fun')
    const note = noteByText(page, 'Retros are fun')

    await note.locator('[data-testid^="note-menu-"]').click()
    await page.locator('[data-testid^="zoom-"]').first().click()
    await expect(page.getByTestId('zoom-text')).toHaveText('Retros are fun')
    await page.getByTestId('zoom-close').click()
    await expect(page.getByTestId('zoom')).toHaveCount(0)

    test.skip(isMobile, 'the z key is for a keyboard')
    await note.focus()
    await page.keyboard.press('z')
    await expect(page.getByTestId('zoom')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(note).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('zoom')).toHaveCount(0)
  })

  test('a double click on the vote button does not zoom', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Vote me')
    const vote = noteByText(page, 'Vote me').locator('[data-testid^="vote-"]')
    if (await vote.count()) await vote.first().dblclick({ force: true })
    await expect(page.getByTestId('zoom')).toHaveCount(0)
  })
})
