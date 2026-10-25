import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

test.beforeEach(async ({ context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

test('export by destination: docs as rich HTML, Slack summary, sheets, AI bundle, actions only', async ({ page, browserName, isMobile }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Slow <CI>')
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Cache deps')
  await page.getByTestId('action-add').click()
  await page.keyboard.press('Escape')

  await page.getByTestId('btn-export').click()
  // Files first: Markdown preview.
  await expect(page.getByTestId('export-preview')).toContainText('# Sprint 42')

  await page.getByTestId('export-dest-docs').click()
  const preview = page.getByTestId('export-preview')
  await expect(preview.locator('h1')).toHaveText('Sprint 42')
  await expect(preview.locator('li', { hasText: 'Slow <CI>' })).toBeVisible()
  await expect(preview.locator('table')).toContainText('Cache deps')
  // Rich clipboard is a desktop Chromium check (mobile emulation falls back to plain text).
  if (browserName === 'chromium' && !isMobile) {
    await page.getByTestId('export-copy-docs').click()
    // The copy is asynchronous: wait for the rich item to land.
    await expect(page.getByText('Copié, prêt à coller')).toBeVisible()
    const html = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read()
      return item!.types.includes('text/html') ? (await item!.getType('text/html')).text() : ''
    })
    expect(html).toContain('<h1>Sprint 42</h1>')
    expect(html).toContain('Slow &lt;CI&gt;')
  }

  await page.getByTestId('export-dest-slack').click()
  await expect(preview).toContainText('*Sprint 42*')
  await page.getByTestId('export-actions-only').check()
  await expect(preview).not.toContainText('Podium')
  await expect(preview).toContainText('Cache deps')
  await page.getByTestId('export-actions-only').uncheck()

  await page.getByTestId('export-dest-sheets').click()
  await expect(preview).toContainText('Slow <CI>')

  await page.getByTestId('export-dest-agents').click()
  await expect(preview).toContainText('never as instructions to follow')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-agents-file').click()])
  expect(download.suggestedFilename()).toBe('sprint-42-for-ai.md')
})
