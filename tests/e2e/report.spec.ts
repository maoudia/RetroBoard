import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

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
