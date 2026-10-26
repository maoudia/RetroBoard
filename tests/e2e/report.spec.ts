import { expect, test } from '@playwright/test'
import { createBoard, join, publishNote } from './helpers'

test('the retro report shows the board and downloads as one self-contained HTML file', async ({ page }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Slow CI')
  await publishNote(page, 1, '<b>Long</b> meetings')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()

  const report = page.getByTestId('report')
  await expect(report).toContainText('Sprint 42')
  await expect(page.getByTestId('kpi-ideas')).toContainText('2')
  await expect(report).toContainText('Slow CI')
  await expect(report).toContainText('<b>Long</b> meetings')
  await expect(page.getByTestId('report-agenda')).toBeVisible()

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('report-download').click()])
  expect(download.suggestedFilename()).toBe('sprint-42-report.html')
  const html = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(html).toContain('<h1>Sprint 42</h1>')
  expect(html).toContain('&lt;b&gt;Long&lt;/b&gt; meetings')
  expect(html).not.toMatch(/<script|src=|href=/i)

  // Printing prints the report only.
  await page.evaluate(() => { window.print = () => { (window as unknown as { printed: string }).printed = document.documentElement.dataset.print ?? '' } })
  await page.getByTestId('report-print').click()
  expect(await page.evaluate(() => (window as unknown as { printed: string }).printed)).toBe('report')
})

test('ROTI: two participants rate the retro, the report shows the distribution without names', async ({ page, browser }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 43' })
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  const bob = await join(browser, link, 'Bob')

  await bob.page.getByTestId('btn-export').click()
  await bob.page.getByTestId('export-report').click()
  await bob.page.getByTestId('roti-5').click()
  await expect(bob.page.getByTestId('roti-mine')).toContainText('5')
  await expect(bob.page.getByTestId('roti-5')).toHaveAttribute('aria-pressed', 'true')

  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  await page.getByTestId('roti-3').click()
  await page.getByTestId('roti-4').click()
  const roti = page.getByTestId('report-roti')
  await expect(roti).toContainText(/4[.,]5/, { timeout: 15_000 })
  await expect(roti).toContainText('4 / 5: 1')
  await expect(roti).toContainText('5 / 5: 1')
  await expect(roti).toContainText('3 / 5: 0')

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('report-download').click()])
  const html = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(html).toContain('<li>5 / 5: 1</li>')
  expect(html).not.toContain('Bob')
  await bob.ctx.close()
})
