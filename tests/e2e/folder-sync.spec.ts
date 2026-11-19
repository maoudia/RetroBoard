import { type BrowserContext, type Page, expect, test } from '@playwright/test'
import { axe, createBoard, enterName, noteByText, publishNote } from './helpers'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
/** The folder tests stub the picker with a folder of the origin private file system (see `stubPicker`). */
const WEBKIT_NO_OPFS = "Playwright's WebKit has no origin private file system in its ephemeral contexts: navigator.storage.getDirectory() throws UnknownError there, so the folder stub has nothing to hand out"
const PASSWORD = 'correct horse battery staple'
const CANARIES = ['CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e']
const [TITLE, NOTE, NAME] = CANARIES as [string, string, string]

/**
 * Change user-drive-storage, group 2: sync with a folder. Headless browsers cannot show the folder picker, so it is stubbed
 * with a folder of the origin private file system: the same File System Access API the real picker hands out, read and
 * written by the same adapter. The folder of a second browser is filled by a sync-client simulator that copies files.
 */

/** The picker answers with a folder of this browser's origin private file system. */
async function stubPicker(ctx: BrowserContext, name = 'SyncFolder') {
  await ctx.addInitScript((folder) => {
    ;(window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true })
  }, name)
}

interface FolderFile { path: string; b64: string; modified: number }

/** Every file of the folder, as a sync client would see it. */
const readFolder = (page: Page, name = 'SyncFolder') => page.evaluate(async (folder): Promise<FolderFile[]> => {
  const out: FolderFile[] = []
  const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    for await (const [entry, handle] of (dir as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (handle.kind === 'directory') { await walk(handle as FileSystemDirectoryHandle, `${prefix}${entry}/`); continue }
      const file = await (handle as FileSystemFileHandle).getFile()
      const bytes = new Uint8Array(await file.arrayBuffer())
      let bin = ''
      for (const b of bytes) bin += String.fromCharCode(b)
      out.push({ path: `${prefix}${entry}`, b64: btoa(bin), modified: file.lastModified })
    }
  }
  try { await walk(await (await navigator.storage.getDirectory()).getDirectoryHandle(folder), '') } catch { /* no folder yet */ }
  return out
}, name)

const writeFolder = (page: Page, files: FolderFile[], name = 'SyncFolder') => page.evaluate(async ({ folder, files: list }) => {
  let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true })
  const root = dir
  for (const f of list) {
    dir = root
    const parts = f.path.split('/')
    const file = parts.pop()!
    for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true })
    const w = await (await dir.getFileHandle(file, { create: true })).createWritable()
    await w.write(Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0)))
    await w.close()
  }
}, { folder: name, files })

/** The user's sync client: files that are new or newer on one side appear on the other. */
async function carry(from: Page, to: Page) {
  const mine = new Map((await readFolder(to)).map((f) => [f.path, f]))
  const news = (await readFolder(from)).filter((f) => { const known = mine.get(f.path); return !known || (known.b64 !== f.b64 && f.modified > known.modified) })
  if (news.length) await writeFolder(to, news)
}

async function openSync(page: Page) {
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('sync-section').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('sync-section')).toBeVisible()
}

const status = (page: Page) => page.getByTestId('sync-status')

async function createVault(page: Page) {
  await page.getByTestId('sync-choose').click()
  await page.getByTestId('sync-password').fill(PASSWORD)
  await page.getByTestId('sync-password-confirm').fill(PASSWORD)
  await page.getByTestId('sync-create').click()
  await expect(page.getByTestId('sync-recovery-key')).toBeVisible({ timeout: 20_000 })
}

async function startSync(page: Page) {
  await page.getByTestId('sync-ack-stored').check()
  await page.getByTestId('sync-ack-understand').check()
  await page.getByTestId('sync-start').click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
}

test('create a vault in a folder, see the recovery key and the warning, sync, lock after a reload, unlock, disconnect', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  await stubPicker(context)
  await createBoard(page, { template: 'start-stop-continue', name: NAME, title: TITLE })
  await publishNote(page, 0, NOTE)
  await openSync(page)

  // Nothing is written before the person has chosen a password and confirmed the recovery key.
  await expect(page.getByTestId('sync-choose')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  expect(await readFolder(page)).toEqual([])
  await page.getByTestId('sync-choose').click()
  await expect(page.getByTestId('sync-create')).toBeDisabled()
  await page.getByTestId('sync-password').fill('short')
  await expect(page.getByTestId('sync-create')).toBeDisabled()
  await page.getByTestId('sync-password').fill(PASSWORD)
  await expect(page.getByTestId('sync-strength')).toBeVisible()
  await page.getByTestId('sync-password-confirm').fill('another long password!')
  await expect(page.getByTestId('sync-create')).toBeDisabled()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await page.getByTestId('sync-password-confirm').fill(PASSWORD)
  await page.getByTestId('sync-create').click()

  // The recovery key, and the plain warning, before anything is synced.
  await expect(page.getByTestId('sync-recovery-key')).toHaveText(/^[A-Z2-7]{4}(-[A-Z2-7]{4}){7}-[A-Z2-7]{2}$/, { timeout: 20_000 })
  await expect(page.getByTestId('sync-warning')).toContainText(/ne peut lire|cannot be recovered|impossible/i)
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  const start = page.getByTestId('sync-start')
  await expect(start).toBeDisabled()
  await page.getByTestId('sync-ack-stored').check()
  await expect(start).toBeDisabled()
  await page.getByTestId('sync-ack-understand').check()
  await expect(start).toBeEnabled()
  await start.click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
  await expect(page.getByTestId('sync-devices')).toBeVisible()
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])

  // The folder holds the vault in a RetroBoard subfolder and nothing readable: the canary test on the real folder.
  const files = await readFolder(page)
  const paths = files.map((f) => f.path)
  expect(paths).toContain('RetroBoard/info.json')
  expect(paths.some((p) => /^RetroBoard\/m\/[a-z0-9]+\.rbm$/.test(p))).toBe(true)
  expect(paths.filter((p) => /^RetroBoard\/s\/[a-z2-7]{26}\/[a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs$/.test(p)).length).toBeGreaterThan(2)
  for (const p of paths) expect(p).toMatch(/^RetroBoard\/(info\.json|m\/[a-z0-9]+\.rbm|s\/[a-z2-7]{26}\/[a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs)$/)
  const everything = files.map((f) => Buffer.from(f.b64, 'base64').toString('latin1')).join('\n') + paths.join('\n')
  for (const canary of CANARIES) {
    expect(everything.toLowerCase()).not.toContain(canary.toLowerCase())
    expect(everything).not.toContain(Buffer.from(canary).toString('base64').slice(0, 12))
  }
  const info = JSON.parse(Buffer.from(files.find((f) => f.path === 'RetroBoard/info.json')!.b64, 'base64').toString('utf8')) as { wraps: { kind: string }[] }
  expect(info.wraps.map((w) => w.kind).sort()).toEqual(['password', 'recovery'])

  // After a reload the vault is locked: the key lives in memory only.
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.getByTestId('sync-chip')).toHaveAttribute('data-status', 'locked', { timeout: 15_000 })
  await page.getByTestId('sync-chip').click()
  await expect(page.getByTestId('sync-unlock-form')).toBeVisible()
  await page.getByTestId('sync-unlock-secret').fill('not the right password')
  await page.getByTestId('sync-unlock').click()
  await expect(page.getByTestId('sync-error')).toContainText(/incorrect|Wrong/i, { timeout: 20_000 })
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await page.getByTestId('sync-unlock-secret').fill(PASSWORD)
  await page.getByTestId('sync-unlock').click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })

  // "Sync now" is there, and the chip shows the state in words.
  await page.getByTestId('sync-now').click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced')
  await expect(page.getByTestId('sync-chip')).toContainText(/Synchronisé|Synced/)

  // Disconnect and forget, with the vault files: the folder keeps nothing of the vault, the boards stay.
  await page.getByTestId('sync-delete-files').check()
  await page.getByTestId('sync-delete-password').fill(PASSWORD)
  await page.getByTestId('sync-disconnect').click()
  await page.getByTestId('confirm').click()
  await expect(page.getByTestId('sync-choose')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('sync-chip')).toHaveCount(0)
  expect((await readFolder(page)).map((f) => f.path)).toEqual([])
  await page.keyboard.press('Escape')
  await page.goto('/boards')
  await expect(page.locator('[data-testid^="library-row-"]').filter({ hasText: TITLE })).toBeVisible()
})

test('a vault is not overwritten: the folder of an existing one asks for its password, and a recovery key opens it too', async ({ browser, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const a = await ctxA.newPage()
  await stubPicker(ctxA)
  await a.goto('/new')
  await openSync(a)
  await createVault(a)
  const recovery = (await a.getByTestId('sync-recovery-key').textContent())!.trim()
  await startSync(a)
  const files = await readFolder(a)

  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const b = await ctxB.newPage()
  await stubPicker(ctxB)
  await b.goto('/new')
  await writeFolder(b, files)
  await openSync(b)
  await b.getByTestId('sync-choose').click()
  await expect(b.getByTestId('sync-unlock-form')).toBeVisible()
  await expect(b.getByTestId('sync-create-form')).toHaveCount(0)
  await b.getByTestId('sync-unlock-switch').click()
  await b.getByTestId('sync-unlock-secret').fill(recovery.slice(0, -1) + (recovery.endsWith('A') ? 'B' : 'A'))
  await b.getByTestId('sync-unlock').click()
  await expect(b.getByTestId('sync-error')).toContainText(/clé|key/i)
  await b.getByTestId('sync-unlock-secret').fill(recovery.toLowerCase())
  await b.getByTestId('sync-unlock').click()
  await expect(status(b)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
  await ctxA.close()
  await ctxB.close()
})

/** A board from the form's defaults; the name dialog only appears when this browser has no name yet. */
async function newBoard(page: Page, title: string, name: string) {
  await page.goto('/new')
  await page.getByTestId('setup-title').fill(title)
  await page.getByTestId('setup-passcode').fill('')
  await page.getByTestId('setup-submit').click()
  await page.getByTestId('confirm').click()
  if (await page.getByTestId('name-input').waitFor({ timeout: 4000 }).then(() => true, () => false)) await enterName(page, name)
  await expect(page.getByTestId('board')).toBeVisible()
  // The invite panel opens on a new board.
  if (await page.getByTestId('share-url').waitFor({ timeout: 5000 }).then(() => true, () => false)) await page.keyboard.press('Escape')
  await expect(page.getByTestId('share-url')).toBeHidden()
}

test('two browsers: the library appears, a board opens with its events, a setting follows, and two offline edits merge', async ({ browser, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  test.setTimeout(180_000)
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  await stubPicker(ctxA)
  await stubPicker(ctxB)
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()

  await createBoard(a, { template: 'start-stop-continue', name: 'Alice', title: 'Shared retro' })
  await publishNote(a, 0, 'Seen on the other computer')
  await openSync(a)
  await createVault(a)
  await startSync(a)
  await expect.poll(async () => (await readFolder(a)).filter((f) => f.path.endsWith('.rbs')).length, { timeout: 15_000 }).toBeGreaterThan(2)

  // The sync client brings the files to the second computer; there the person connects the same folder.
  await b.goto('/new')
  await carry(a, b)
  await openSync(b)
  await b.getByTestId('sync-choose').click()
  await b.getByTestId('sync-unlock-secret').fill(PASSWORD)
  await b.getByTestId('sync-unlock').click()
  await expect(status(b)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
  await b.keyboard.press('Escape')

  // The library lists the board; opening it restores its events from the folder before the live path.
  await b.goto('/boards')
  const rowB = b.locator('[data-testid^="library-row-"]').filter({ hasText: 'Shared retro' })
  await expect(rowB).toBeVisible({ timeout: 15_000 })
  await rowB.getByRole('link', { name: /Shared retro/ }).first().click()
  await expect(noteByText(b, 'Seen on the other computer')).toBeVisible({ timeout: 20_000 })

  // A setting changes on one side and shows on the other.
  await a.goto('/new')
  await openSync(a)
  await a.getByTestId('sync-unlock-secret').fill(PASSWORD).catch(() => undefined)
  await unlockIfLocked(a)
  const sound = a.getByTestId('set-sound')
  const wasOn = await sound.isChecked()
  await sound.setChecked(!wasOn)
  await a.getByTestId('sync-now').click()
  await expect(status(a)).toHaveAttribute('data-status', 'synced')
  await carry(a, b)
  await b.goto('/new')
  await openSync(b)
  await unlockIfLocked(b)
  await b.getByTestId('sync-now').click()
  await expect(b.getByTestId('set-sound')).toBeChecked({ checked: !wasOn })

  // Two edits made offline, one on each side, both end up on both.
  await a.keyboard.press('Escape')
  await newBoard(a, 'Retro from A', 'Alice')
  await newBoard(b, 'Retro from B', 'Bob')
  for (const p of [a, b]) { await p.getByTestId('btn-profile').click(); await unlockIfLocked(p); await p.getByTestId('sync-now').click(); await expect(status(p)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 }); await p.keyboard.press('Escape') }
  await carry(a, b)
  await carry(b, a)
  for (const p of [a, b]) { await p.getByTestId('btn-profile').click(); await p.getByTestId('sync-now').click(); await expect(status(p)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 }); await p.keyboard.press('Escape') }
  for (const p of [a, b]) {
    await p.goto('/boards')
    for (const title of ['Shared retro', 'Retro from A', 'Retro from B']) await expect(p.locator('[data-testid^="library-row-"]').filter({ hasText: title })).toBeVisible({ timeout: 15_000 })
  }
  await ctxA.close()
  await ctxB.close()
})

/** After a navigation the vault is locked again (the key is in memory only): type the password if the form asks for it. */
async function unlockIfLocked(page: Page) {
  const form = page.getByTestId('sync-unlock-form')
  // The section loads on demand: wait for whichever of the two it shows.
  await expect(form.or(status(page))).toBeVisible({ timeout: 20_000 })
  if (await form.isVisible()) {
    await page.getByTestId('sync-unlock-secret').fill(PASSWORD)
    await page.getByTestId('sync-unlock').click()
  }
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
}

test('a browser without the folder picker says so, and nothing else changes', async ({ page }) => {
  await page.addInitScript(() => { delete (window as unknown as Record<string, unknown>).showDirectoryPicker })
  await page.goto('/new')
  await openSync(page)
  await expect(page.getByTestId('sync-unsupported')).toBeVisible()
  await expect(page.getByTestId('sync-choose')).toHaveCount(0)
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
})

test('the sync screens fit a 360 px phone and a wide screen without sideways scrolling, and the recovery key is reachable by keyboard', async ({ browser, browserName }) => {
  test.skip(browserName === 'webkit', WEBKIT_NO_OPFS)
  for (const [width, height] of [[360, 740], [2560, 1300]] as const) {
    const ctx = await browser.newContext({ viewport: { width, height } })
    await stubPicker(ctx)
    const page = await ctx.newPage()
    await page.goto('/new')
    await openSync(page)
    // The section, and everything in it, stays inside its own box.
    const fits = () => page.evaluate(() => {
      const section = document.querySelector('[data-testid="sync-section"]') as HTMLElement
      const box = section.getBoundingClientRect()
      return section.scrollWidth <= section.clientWidth + 1 && [...section.querySelectorAll<HTMLElement>('*')].every((e) => e.getBoundingClientRect().right <= box.right + 1)
    })
    expect(await fits()).toBe(true)
    await createVault(page)
    expect(await fits()).toBe(true)
    // Keyboard: the boxes and the start button are reached by tab, and space ticks a box.
    await page.getByTestId('sync-ack-stored').focus()
    await page.keyboard.press('Space')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Space')
    await expect(page.getByTestId('sync-ack-stored')).toBeChecked()
    await expect(page.getByTestId('sync-ack-understand')).toBeChecked()
    await page.keyboard.press('Tab')
    await expect(page.getByTestId('sync-start')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
    expect(await fits()).toBe(true)
    expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
    await ctx.close()
  }
})
