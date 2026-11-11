import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { createBoard, join, publishNote, saveFile, settle } from './helpers'
import { readPdf } from './pdf-text'

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

  const [download] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'report-download')])
  expect(download.suggestedFilename()).toBe('sprint-42-report.html')
  const html = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(html).toContain('<h1>Sprint 42</h1>')
  expect(html).toContain('&lt;b&gt;Long&lt;/b&gt; meetings')
  expect(html).not.toMatch(/<script|src=|href=/i)

  // Printing prints the report only.
  await page.evaluate(() => { window.print = () => { (window as unknown as { printed: string }).printed = document.documentElement.dataset.print ?? '' } })
  await settle(page) // the report dialog slides in: click it once it stopped moving
  await page.getByTestId('report-print').dispatchEvent('click')
  expect(await page.evaluate(() => (window as unknown as { printed: string }).printed)).toBe('report')
})

test('the report file prints to an A4 PDF that contains the actions table (export-hub 1.2)', async ({ page, browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'page.pdf() is Chromium only')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Slow CI')
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Cache deps')
  await page.getByTestId('action-add').click()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  const [download] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'report-download')])
  const html = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))

  // The file itself, as a browser prints it: Playwright renders the print media to a tagged PDF.
  const printer = await browser.newPage()
  await printer.setContent(html)
  const pdf = readPdf(await printer.pdf({ preferCSSPageSize: true, tagged: true }))
  await printer.close()
  expect(pdf.pages.length).toBeGreaterThan(0)
  for (const page of pdf.pages) expect(page).toEqual({ width: 595, height: 842 }) // @page A4
  expect(pdf.tags).toContain('Table')
  const text = pdf.text.join('\n')
  for (const part of ['Sprint 42', 'Slow CI', 'Cache deps']) expect(text).toContain(part)
  // The table header row and its cells are all there, not only the heading.
  expect(text).toMatch(/Action[\s\S]*Cache deps/)
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

  const [download] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'report-download')])
  const html = await (await download.createReadStream()).toArray().then((c) => Buffer.concat(c).toString('utf8'))
  expect(html).toContain('<li>5 / 5: 1</li>')
  expect(html).not.toContain('Bob')
  await bob.ctx.close()
})

test('a passphrase encrypts the downloaded report, which unlocks offline from the file alone', async ({ page, context }) => {
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 44' })
  await publishNote(page, 0, 'Private idea')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  await page.getByTestId('report-passphrase').fill('correct horse')
  const [download] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'report-download')])
  expect(download.suggestedFilename()).toBe('sprint-44-report-encrypted.html')
  const file = test.info().outputPath('report-encrypted.html')
  await download.saveAs(file)
  const html = readFileSync(file, 'utf8')
  expect(html).not.toContain('Private idea')

  const viewer = await context.newPage()
  const problems: string[] = []
  viewer.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()) })
  await context.setOffline(true)
  await viewer.goto(`file://${file}`)
  await viewer.locator('#w').fill('wrong')
  await viewer.getByRole('button').click()
  await expect(viewer.locator('#e')).toBeVisible()
  await viewer.locator('#w').fill('correct horse')
  await viewer.getByRole('button').click()
  await expect(viewer.locator('#o')).toContainText('Private idea')
  await expect(viewer.locator('#o h1')).toHaveText('Sprint 44')
  expect(problems.filter((p) => /Content Security Policy/i.test(p))).toEqual([])
  await context.setOffline(false)
})
