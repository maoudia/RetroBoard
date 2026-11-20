import { type BrowserContext, type Page, expect, test } from '@playwright/test'
import { axe, createBoard, publishNote } from './helpers'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const WEBKIT_NO_OPFS = "Playwright's WebKit has no origin private file system in its ephemeral contexts: navigator.storage.getDirectory() throws UnknownError there, so the folder stub has nothing to hand out"
const PASSWORD = 'correct horse battery staple'

/**
 * Change sync-ux, groups 1 to 3: the sync shield at the start of the toolbar, any folder, the onboarding sheet and the one-time nudge.
 * Headless browsers have no folder picker: it is stubbed with a folder of the origin private file system, chosen by `window.__pick`.
 */
async function stubPicker(ctx: BrowserContext, first = 'FolderA') {
  await ctx.addInitScript((name) => {
    const w = window as unknown as { __pick: string; showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }
    w.__pick = name
    w.showDirectoryPicker = async () => {
      if (w.__pick === 'REFUSE') throw new DOMException('The directory is not allowed', 'AbortError')
      return (await navigator.storage.getDirectory()).getDirectoryHandle(w.__pick, { create: true })
    }
  }, first)
}
const pick = (page: Page, name: string) => page.evaluate((n) => { (window as unknown as { __pick: string }).__pick = n }, name)

/** The paths of a folder of the origin private file system. */
const listFolder = (page: Page, name: string) => page.evaluate(async (folder) => {
  const out: string[] = []
  const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    for await (const [entry, handle] of (dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (handle.kind === 'directory') await walk(handle as FileSystemDirectoryHandle, `${prefix}${entry}/`)
      else out.push(`${prefix}${entry}`)
    }
  }
  try { await walk(await (await navigator.storage.getDirectory()).getDirectoryHandle(folder), '') } catch { /* no such folder */ }
  return out.sort()
}, name)

/** The files of one folder written into another, as a person moving the folder with their own tools would. */
const moveFolder = (page: Page, from: string, to: string) => page.evaluate(async ({ from: a, to: b }) => {
  const root = await navigator.storage.getDirectory()
  const copy = async (src: FileSystemDirectoryHandle, dst: FileSystemDirectoryHandle): Promise<void> => {
    for await (const [entry, handle] of (src as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (handle.kind === 'directory') { await copy(handle as FileSystemDirectoryHandle, await dst.getDirectoryHandle(entry, { create: true })); continue }
      const bytes = await (await (handle as FileSystemFileHandle).getFile()).arrayBuffer()
      const w = await (await dst.getFileHandle(entry, { create: true })).createWritable()
      await w.write(bytes)
      await w.close()
    }
  }
  await copy(await root.getDirectoryHandle(a), await root.getDirectoryHandle(b, { create: true }))
}, { from, to })

async function createVault(page: Page) {
  await page.getByTestId('sync-password').fill(PASSWORD)
  await page.getByTestId('sync-password-confirm').fill(PASSWORD)
  await page.getByTestId('sync-create').click()
  await expect(page.getByTestId('sync-recovery-key')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('sync-ack-stored').check()
  await page.getByTestId('sync-ack-understand').check()
  await page.getByTestId('sync-start').click()
  await expect(page.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
}

const shield = (page: Page) => page.getByTestId('sync-shield')

test('the shield is at the start of the toolbar for everyone, named in words, and starts the onboarding when sync is not set up', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  await page.route('**/providers.json', (route) => route.fulfill({ json: {} }))
  await createBoard(page, { template: 'start-stop-continue' })
  await expect(shield(page)).toBeVisible()
  await expect(shield(page)).toHaveAttribute('data-connected', 'false')
  // Next to the board's encryption badge, before the board switch and the tools; a different name for each shield.
  const [badge, mine, share] = await Promise.all(['encryption-badge', 'sync-shield', 'btn-share'].map((id) => page.getByTestId(id).boundingBox()))
  expect(badge!.x).toBeLessThan(mine!.x)
  expect(mine!.x).toBeLessThan(share!.x)
  const names = await Promise.all([page.getByTestId('encryption-badge'), shield(page)].map((l) => l.getAttribute('aria-label')))
  expect(names[1]).toMatch(/Synchronisation|Sync/i)
  expect(names[0]).not.toBe(names[1])
  // Keyboard: reachable, and Enter does what a press does.
  await shield(page).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('sync-sheet')).toBeVisible()
  await expect(page.getByTestId('sync-sheet')).toContainText(/pas de compte|no account/i)
  await expect(page.getByTestId('sync-why')).toBeVisible()
  await page.getByTestId('sync-why').click()
  await expect(page.getByTestId('sync-why-text')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
})

test('a browser with no folder picker is not shown the folder, and says so plainly', async ({ page }) => {
  await page.route('**/providers.json', (route) => route.fulfill({ json: {} }))
  await page.addInitScript(() => { delete (window as unknown as Record<string, unknown>).showDirectoryPicker })
  await createBoard(page, { template: 'start-stop-continue' })
  await shield(page).click()
  await expect(page.getByTestId('sync-sheet')).toBeVisible()
  await expect(page.getByTestId('sync-path-folder')).toHaveCount(0)
  await expect(page.getByTestId('sync-sheet-none')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
})

test('press the shield to sync now, find the settings from the message, lock after a reload and unlock from the shield', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  await stubPicker(context)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'Shield board' })
  await publishNote(page, 0, 'An idea')
  await shield(page).click()
  await expect(page.getByTestId('sync-path-folder')).toBeVisible()
  await page.getByTestId('sync-path-folder').click()
  await createVault(page)
  await page.keyboard.press('Escape')
  await expect(shield(page)).toHaveAttribute('data-status', 'synced')

  // One press syncs now and says so, politely, with a way to the settings.
  await shield(page).click()
  const toast = page.getByTestId('toasts').getByRole('status').filter({ hasText: /Synchronisé à|Synced/ })
  await expect(toast).toBeVisible()
  await expect(toast).toContainText(/\d{2}:\d{2}/)
  await page.getByTestId('sync-toast-settings').click()
  await expect(page.getByTestId('sync-status')).toBeVisible()
  await page.keyboard.press('Escape')

  // The menu is an extra path (a right click here, a long press on a touch screen).
  await shield(page).click({ button: 'right' })
  await expect(page.getByTestId('sync-menu-settings')).toBeVisible()
  await page.keyboard.press('Escape')

  // After a reload the vault is locked: the shield says so, and pressing it opens the unlock prompt.
  await page.reload()
  await expect(shield(page)).toHaveAttribute('data-status', 'locked', { timeout: 15_000 })
  await shield(page).click()
  await expect(page.getByTestId('sync-unlock-form')).toBeVisible()
  await page.getByTestId('sync-unlock-secret').fill(PASSWORD)
  await page.getByTestId('sync-unlock').click()
  await expect(page.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
})

test('any folder: a refused directory is explained with a subfolder name, and the vault moves to another folder with the same vault id', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  await stubPicker(context, 'REFUSE')
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await shield(page).click()
  await page.getByTestId('sync-path-folder').click()
  await expect(page.getByTestId('sync-error')).toContainText('RetroBoard Sync')
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])

  await pick(page, 'FolderA')
  await page.getByTestId('sync-path-folder').click()
  await createVault(page)
  expect(await listFolder(page, 'FolderA')).toContain('RetroBoard/info.json')

  // The person moves the folder with their own tools, then chooses it again: the same vault continues, nothing is duplicated.
  await moveFolder(page, 'FolderA', 'FolderB')
  await pick(page, 'FolderB')
  await page.getByTestId('sync-move').click()
  await expect(page.getByTestId('sync-choice')).toHaveCount(0)
  await expect(page.getByText('FolderB').first()).toBeVisible()
  await expect(page.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })

  // An empty folder is offered a copy of the vault, never filled by itself.
  await pick(page, 'FolderEmpty')
  await page.getByTestId('sync-move').click()
  await expect(page.getByTestId('sync-choice')).toBeVisible()
  expect(await listFolder(page, 'FolderEmpty')).toEqual([])
  await page.getByTestId('sync-choice-copy').click()
  await expect(page.getByTestId('sync-status')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
  expect(await listFolder(page, 'FolderEmpty')).toContain('RetroBoard/info.json')

  // A folder that holds another vault asks which to use, and merges nothing: a new one goes into a subfolder.
  const other = await context.newPage()
  await other.goto('/new')
  await other.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    await (await (await (await root.getDirectoryHandle('Foreign', { create: true })).getDirectoryHandle('RetroBoard', { create: true })).getFileHandle('info.json', { create: true })).createWritable().then(async (w) => { await w.write('{"vaultId":"someone-elses"}'); await w.close() })
  })
  await other.close()
  await pick(page, 'Foreign')
  await page.getByTestId('sync-move').click()
  await expect(page.getByTestId('sync-choice-use')).toBeVisible()
  await expect(page.getByTestId('sync-choice-new')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await page.getByTestId('sync-choice-new').click()
  await expect(page.getByTestId('sync-create-form')).toBeVisible()
  expect(await listFolder(page, 'Foreign')).toEqual(['RetroBoard/info.json'])
})

test('the nudge follows the first board, once: "Not now" stays dismissed, and it never shows during a running phase', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('retroboard:sync-nudge-delay', '0'))
  await page.route('**/providers.json', (route) => route.fulfill({ json: {} }))
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await expect(page.getByTestId('sync-nudge')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await page.getByTestId('sync-nudge-later').click()
  await expect(page.getByTestId('sync-nudge')).toHaveCount(0)
  await page.reload()
  await expect(shield(page)).toBeVisible()
  await page.waitForTimeout(500)
  await expect(page.getByTestId('sync-nudge')).toHaveCount(0)
})

test('a running phase shows no nudge', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('retroboard:sync-nudge-delay', '0'))
  await page.route('**/providers.json', (route) => route.fulfill({ json: {} }))
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice', autoAgenda: true })
  await expect(page.getByTestId('board')).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(page.getByTestId('sync-nudge')).toHaveCount(0)
})

for (const width of [360, 768, 1280, 2560]) {
  test(`the shield stays reachable and the toolbar does not overflow at ${width} px`, async ({ page }) => {
    await page.route('**/providers.json', (route) => route.fulfill({ json: {} }))
    await page.setViewportSize({ width, height: width < 600 ? 740 : 900 })
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', title: 'A board with a fairly long title' })
    await expect(shield(page)).toBeVisible()
    const box = (await shield(page).boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    if (width <= 720) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44) }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    expect(await page.getByTestId('btn-boards').or(page.getByTestId('board-title')).first().isVisible()).toBe(true)
    // Folded on a phone, the shield is still there.
    if (width < 600) {
      const hide = page.getByTestId('chrome-hide')
      if (await hide.isVisible()) await hide.click()
      await expect(shield(page)).toBeVisible()
    }
  })
}
