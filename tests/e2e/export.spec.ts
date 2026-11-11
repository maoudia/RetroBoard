import { expect, test } from '@playwright/test'
import { axe, collectProblems, createBoard, publishNote, saveFile, settle } from './helpers'

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
  // The preview is the pasted HTML in a sandboxed frame.
  await expect(preview).toHaveAttribute('sandbox', '')
  const docs = page.frameLocator('[data-testid="export-preview"]')
  await expect(docs.locator('h1')).toHaveText('Sprint 42')
  await expect(docs.locator('li', { hasText: 'Slow <CI>' })).toBeVisible()
  await expect(docs.locator('table')).toContainText('Cache deps')
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
  const [download] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'export-agents-file')])
  expect(download.suggestedFilename()).toBe('sprint-42-for-ai.md')
  // RAG-friendly files (export-hub 3.4): one chunk per line, never the author names.
  const [jsonl] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'export-rag-jsonl')])
  expect(jsonl.suggestedFilename()).toBe('sprint-42-chunks.jsonl')
  const text = (await (await import('node:fs/promises')).readFile((await jsonl.path())!, 'utf8')).trim().split('\n')
  expect(text.length).toBeGreaterThan(1)
  expect(() => text.map((l) => JSON.parse(l))).not.toThrow()
  const [md] = await Promise.all([page.waitForEvent('download'), saveFile(page, 'export-rag-md')])
  expect(md.suggestedFilename()).toBe('sprint-42-sections.md')
})

const bytesOf = (b: Buffer) => (b.length < 1000 ? `${b.length} B` : `${(b.length / 1000).toFixed(1)} kB`)
const readDownload = async (d: import('@playwright/test').Download) => Buffer.concat(await (await d.createReadStream()).toArray())

test('file preview before saving: every format is shown as the user will see it, with its name and size, and Save writes that very file (export-hub 2.3)', async ({ page }) => {
  const problems = await collectProblems(page)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Slow <CI>')
  await publishNote(page, 1, 'Needs, commas "quoted"')
  await page.getByTestId('btn-actions').click()
  await page.getByTestId('action-text').fill('Cache deps')
  await page.getByTestId('action-add').click()
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-export').click()

  const name = page.getByTestId('file-preview-name')
  const size = page.getByTestId('file-preview-size')
  const frame = page.frameLocator('[data-testid="file-preview-frame"]')
  /** Opens the preview of a button, checks its name, then saves and checks the downloaded bytes against the size shown. */
  const previewAndSave = async (button: string, filename: string, shown: () => Promise<void>) => {
    await page.getByTestId(button).click()
    await expect(name).toHaveText(filename)
    await shown()
    const label = (await size.textContent())!
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('file-preview-save').click()])
    expect(download.suggestedFilename()).toBe(filename)
    expect(bytesOf(await readDownload(download))).toBe(label)
    // Saving returns to the destinations.
    await expect(page.getByTestId('file-preview')).toBeHidden()
  }

  // Back leaves without saving.
  await page.getByTestId('export-md').click()
  await page.getByTestId('file-preview-back').click()
  await expect(page.getByTestId('file-preview')).toBeHidden()
  await expect(page.getByTestId('export-preview')).toContainText('# Sprint 42')

  // Markdown is rendered, not shown as source.
  await previewAndSave('export-md', 'sprint-42.md', async () => {
    await expect(frame.locator('h1')).toHaveText('Sprint 42')
    await expect(frame.locator('li', { hasText: 'Slow <CI>' })).toBeVisible()
  })

  // CSV is a table: quoted cells keep their commas and quotes.
  await previewAndSave('export-csv', 'sprint-42.csv', async () => {
    const table = page.getByTestId('file-preview-table')
    await expect(table.locator('thead th')).toHaveCount(5)
    await expect(table.getByRole('cell', { name: 'Slow <CI>' })).toBeVisible()
    await expect(table.getByRole('cell', { name: 'Needs, commas "quoted"' })).toBeVisible()
  })

  // JSON is folded: the first level is open, deeper ones fold.
  await previewAndSave('export-json', 'sprint-42.json', async () => {
    const json = page.getByTestId('file-preview-json')
    await expect(json.locator('details[open]')).toHaveCount(1)
    expect(await json.locator('details:not([open])').count()).toBeGreaterThan(0)
    await json.locator('details:not([open]) > summary').first().click()
    await expect(json.locator('details[open]')).toHaveCount(2)
  })

  // The board file is encrypted: name and size only.
  await previewAndSave('export-retro', 'sprint-42.retro', async () => {
    await expect(page.getByTestId('file-preview-opaque')).toBeVisible()
  })

  await page.getByTestId('export-dest-jira').click()
  await previewAndSave('export-actions', 'sprint-42-actions.csv', async () => {
    const table = page.getByTestId('file-preview-table')
    await expect(table.locator('thead')).toContainText('Summary')
    await expect(table.locator('thead')).toContainText('Assignee')
    await expect(table.getByRole('cell', { name: 'Cache deps' })).toBeVisible()
  })

  await page.getByTestId('export-dest-sheets').click()
  await previewAndSave('export-sheets-file', 'sprint-42.tsv', async () => {
    await expect(page.getByTestId('file-preview-table').getByRole('cell', { name: 'Slow <CI>' })).toBeVisible()
  })

  await page.getByTestId('export-dest-agents').click()
  await previewAndSave('export-agents-file', 'sprint-42-for-ai.md', async () => {
    await expect(frame.locator('pre')).toContainText('retroboard-agents-v1')
  })
  await previewAndSave('export-rag-jsonl', 'sprint-42-chunks.jsonl', async () => {
    await expect(page.getByTestId('file-preview-json')).toContainText('idea:')
  })
  await previewAndSave('export-rag-md', 'sprint-42-sections.md', async () => {
    await expect(frame.locator('pre').first()).toContainText('format: retroboard-rag-v1')
  })

  // The report: name and size from the file, the file itself in the frame.
  await page.getByTestId('export-report').click()
  await previewAndSave('report-download', 'sprint-42-report.html', async () => {
    await expect(frame.locator('h1')).toHaveText('Sprint 42')
    await expect(frame.locator('body')).toContainText('Slow <CI>')
  })
  expect(problems).toEqual([])
})

test('the preview frame is sandboxed, keeps the strict CSP and shows the report with its own stylesheet (export-hub 2.3)', async ({ page }) => {
  const problems = await collectProblems(page)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, '<img src=x onerror=alert(1)>')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-report').click()
  await page.getByTestId('report-download').click()

  const iframe = page.getByTestId('file-preview-frame')
  await expect(iframe).toHaveAttribute('sandbox', '') // no script, no same-origin, no forms, no popups
  const frame = page.frameLocator('[data-testid="file-preview-frame"]')
  await expect(frame.locator('body')).toContainText('<img src=x onerror=alert(1)>') // text, not markup
  expect(await frame.locator('img').count()).toBe(0)
  // The report stylesheet is allowed by hash: the frame looks like the saved file.
  expect(await frame.locator('h2').first().evaluate((h) => getComputedStyle(h).borderBottomWidth)).toBe('1px')
  expect(await frame.locator('.kpi').first().evaluate((k) => getComputedStyle(k).borderRadius)).toBe('10px')
  // The page itself still forbids inline styles and scripts, and every other origin.
  const csp = await page.evaluate(async () => (await fetch(location.href)).headers.get('content-security-policy'))
  expect(csp).toContain("default-src 'none'")
  expect(csp).not.toContain('unsafe-')

  await settle(page)
  const violations = (await axe(page).exclude('[data-testid="file-preview-frame"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations
  expect(violations.map((v) => v.id)).toEqual([])
  expect(problems).toEqual([])
})

test('Slack webhook: posted straight from the browser, kept on this device, never sent to the relay (export-hub 3.1)', async ({ page, baseURL }) => {
  const problems = await collectProblems(page)
  const hook = 'https://hooks.slack.com/services/T0123ABCD/B0456EFGH/s3cretT0ken123'
  const seen: { method: string, type: string | undefined, body: string | null }[] = []
  await page.route('https://hooks.slack.com/**', async (route) => {
    const r = route.request()
    seen.push({ method: r.method(), type: await r.headerValue('content-type'), body: r.postData() })
    await route.fulfill({ status: 200, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'ok' })
  })
  // Everything the relay (this origin) could receive: requests and WebSocket frames, both ways.
  const toRelay: string[] = []
  page.on('request', (r) => { if (r.url().startsWith(baseURL!)) toRelay.push(`${r.method()} ${r.url()} ${r.postData() ?? ''} ${JSON.stringify(r.headers())}`) })
  page.on('websocket', (ws) => { ws.on('framesent', (f) => toRelay.push(String(f.payload))) })

  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Sprint 42' })
  await publishNote(page, 0, 'Slow CI')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-dest-slack').click()
  const post = page.getByTestId('slack-post')
  await expect(post).toBeDisabled()

  // Not a Slack webhook: refused, nothing can be posted.
  await page.getByTestId('slack-webhook').fill('https://evil.example/collect')
  await expect(page.getByRole('alert')).toContainText('webhook')
  await expect(post).toBeDisabled()

  await page.getByTestId('slack-webhook').fill(hook)
  await expect(post).toBeEnabled()
  await settle(page)
  const violations = (await axe(page).exclude('[data-testid="file-preview-frame"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations
  expect(violations.map((v) => v.id)).toEqual([])
  await post.click()
  await expect(page.getByText('Posté sur Slack')).toBeVisible()
  expect(seen).toHaveLength(1)
  expect(seen[0]).toMatchObject({ method: 'POST', type: 'text/plain' }) // a simple request: no CORS preflight
  const sent = JSON.parse(seen[0]!.body!) as { text: string }
  expect(sent.text).toContain('*Sprint 42*')

  // The URL lives in this device's settings...
  expect(await page.evaluate(() => localStorage.getItem('retroboard:settings'))).toContain(hook)
  // ...and nothing the relay could see carries it, nor the secret part of it.
  expect(toRelay.length).toBeGreaterThan(0)
  expect(toRelay.filter((x) => x.includes('s3cretT0ken123') || x.includes('T0123ABCD'))).toEqual([])

  // Forgetting the URL clears the device setting.
  await page.keyboard.press('Escape')
  await page.getByTestId('btn-export').click()
  await page.getByTestId('export-dest-slack').click()
  await page.getByTestId('slack-forget').click()
  expect(await page.evaluate(() => localStorage.getItem('retroboard:settings'))).not.toContain('s3cretT0ken123')
  expect(problems).toEqual([])
})
