import { randomBytes } from 'node:crypto'
import { type APIRequestContext, type BrowserContext, type Page, expect, test } from '@playwright/test'
import { axe, createBoard, noteByText, publishNote } from './helpers'

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const PASSWORD = 'correct horse battery staple'
const CANARIES = ['CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e']
const [TITLE, NOTE, NAME] = CANARIES as [string, string, string]
const GRAPH = `http://127.0.0.1:${process.env.E2E_GRAPH_PORT ?? 8789}`

/**
 * Change user-drive-storage, group 3: sync with OneDrive. The site is started with a client id and the endpoints of a fake Microsoft
 * (tests/e2e/support/fake-graph-server.ts): "Sign in with Microsoft" is a real redirect to the fake authorize endpoint and back to
 * `/storage/callback`, the tokens are traded by the OneDrive worker, and the files land in the fake's app folder. Each test signs in
 * as an account of its own, so parallel tests never share a OneDrive. Only a real Microsoft account proves the rest (owner-checks.md).
 */

let counter = 0
const newAccount = () => `acct-${Date.now().toString(36)}-${(counter++).toString(36)}-${randomBytes(4).toString('hex')}`

/** The next sign-in of this browser context is as this account (the fake reads it from a cookie on its authorize page). */
const asAccount = (ctx: BrowserContext, id: string) => ctx.addCookies([{ name: 'rb_fake_account', value: id, url: GRAPH }])
const remote = async (request: APIRequestContext, body: Record<string, unknown>) => (await request.post(`${GRAPH}/__fake/control`, { data: body })).json() as Promise<Record<string, unknown>>
const objectsOf = async (request: APIRequestContext, account: string) => ((await remote(request, { action: 'objects', account })).paths as string[])

async function openSync(page: Page) {
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('sync-section').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('sync-section')).toBeVisible()
}
const status = (page: Page) => page.getByTestId('sync-status')

/** Preferences > Sync, "Sign in with Microsoft": the window goes to the fake Microsoft and comes back with the dialog open. */
async function signIn(page: Page) {
  await expect(page.getByTestId('sync-onedrive-signin')).toBeVisible()
  await page.getByTestId('sync-onedrive-signin').click()
  await expect(page.getByTestId('sync-section')).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/boards/)
}

async function createVault(page: Page) {
  await expect(page.getByTestId('sync-create-form')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('sync-password').fill(PASSWORD)
  await page.getByTestId('sync-password-confirm').fill(PASSWORD)
  await page.getByTestId('sync-create').click()
  await expect(page.getByTestId('sync-recovery-key')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('sync-ack-stored').check()
  await page.getByTestId('sync-ack-understand').check()
  await page.getByTestId('sync-start').click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 })
}

async function unlock(page: Page) {
  await expect(page.getByTestId('sync-unlock-form')).toBeVisible({ timeout: 20_000 })
  await page.getByTestId('sync-unlock-secret').fill(PASSWORD)
  await page.getByTestId('sync-unlock').click()
  await expect(status(page)).toHaveAttribute('data-status', 'synced', { timeout: 30_000 })
}

test('sign in with Microsoft, create the vault, sync, lock after a reload, unlock, disconnect and forget', async ({ page, context, request }) => {
  const account = newAccount()
  await asAccount(context, account)
  await createBoard(page, { template: 'start-stop-continue', name: NAME, title: TITLE })
  await publishNote(page, 0, NOTE)
  await openSync(page)

  // Offered, with what it is and what it is not, before anything is sent anywhere.
  await expect(page.getByTestId('sync-onedrive')).toContainText(/Apps\/RetroBoard/)
  await expect(page.getByTestId('sync-onedrive')).toContainText(/personal|personnels/i)
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  expect(await objectsOf(request, account)).toEqual([])

  await signIn(page)
  // A new vault is proposed: nothing is on OneDrive yet.
  await expect(page.getByTestId('sync-create-form')).toBeVisible({ timeout: 20_000 })
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])
  await createVault(page)
  await expect(page.getByTestId('sync-section')).toContainText('Apps/RetroBoard')
  await expect(page.getByTestId('sync-revoke-link')).toHaveAttribute('href', 'https://account.microsoft.com/privacy/app-access')
  expect((await axe(page).withTags(WCAG).analyze()).violations).toEqual([])

  // OneDrive holds the vault and nothing readable: the canary test against the real provider path, URLs included.
  await expect.poll(async () => (await objectsOf(request, account)).filter((p) => p.endsWith('.rbs')).length, { timeout: 20_000 }).toBeGreaterThan(2)
  const paths = await objectsOf(request, account)
  expect(paths).toContain('info.json')
  for (const p of paths) expect(p).toMatch(/^(info\.json|m\/[a-z0-9]+\.rbm|s\/[a-z2-7]{26}\/[a-z0-9]+-[0-9a-f]{8}-[0-9a-f]{8}\.rbs)$/)
  expect(await remote(request, { action: 'plaintext', canaries: CANARIES })).toEqual({ ok: true })

  // After a reload the sign-in is back from the sealed token, and the vault is locked: its key lives in memory only.
  await page.keyboard.press('Escape')
  await page.locator('[data-testid^="library-row-"]').filter({ hasText: TITLE }).getByRole('link', { name: new RegExp(TITLE) }).first().click()
  await expect(page.getByTestId('board')).toBeVisible()
  await expect(page.getByTestId('sync-shield')).toHaveAttribute('data-status', 'synced', { timeout: 20_000 })
  await page.reload()
  await expect(page.getByTestId('sync-shield')).toHaveAttribute('data-status', 'locked', { timeout: 20_000 })
  await page.getByTestId('sync-shield').click()
  await page.getByTestId('sync-unlock-secret').fill('not the right password')
  await page.getByTestId('sync-unlock').click()
  await expect(page.getByTestId('sync-error')).toBeVisible({ timeout: 30_000 })
  await unlock(page)
  await expect(page.getByTestId('sync-shield')).toHaveAttribute('aria-label', /Synchronisé|Synced/)

  // Disconnect and forget with the vault files: OneDrive keeps nothing of the vault, this browser keeps no token, the boards stay.
  await page.getByTestId('sync-delete-files').check()
  await page.getByTestId('sync-delete-password').fill(PASSWORD)
  await page.getByTestId('sync-disconnect').click()
  await page.getByTestId('confirm').click()
  await expect(page.getByTestId('sync-path-onedrive')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('sync-shield')).toHaveAttribute('data-connected', 'false')
  expect(await objectsOf(request, account)).toEqual([])
  const left = await page.evaluate(() => new Promise<unknown[]>((resolve) => {
    const open = indexedDB.open('retroboard-sync')
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('state')) { resolve([]); return }
      const all = db.transaction('state').objectStore('state').getAllKeys()
      all.onsuccess = () => resolve(all.result as unknown[])
    }
    open.onerror = () => resolve(['error'])
  }))
  expect(left).toEqual([])
  await page.keyboard.press('Escape')
  await page.goto('/boards')
  await expect(page.locator('[data-testid^="library-row-"]').filter({ hasText: TITLE })).toBeVisible()
})

test('a second device signs in to the same account, enters the password, sees the library, and opens a board whose events come from OneDrive', async ({ browser, request }) => {
  test.setTimeout(120_000)
  const account = newAccount()
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR' })
  await asAccount(ctxA, account)
  await asAccount(ctxB, account)
  const a = await ctxA.newPage()
  const b = await ctxB.newPage()

  await createBoard(a, { template: 'start-stop-continue', name: 'Alice', title: 'Shared retro' })
  await publishNote(a, 0, 'Seen on the other computer')
  await openSync(a)
  await signIn(a)
  await createVault(a)
  await expect.poll(async () => (await objectsOf(request, account)).filter((p) => p.endsWith('.rbs')).length, { timeout: 20_000 }).toBeGreaterThan(2)

  // The other device: sign in, and because a vault is there, the password (or the recovery key), not a new vault.
  await b.goto('/new')
  await openSync(b)
  await signIn(b)
  await expect(b.getByTestId('sync-create-form')).toHaveCount(0)
  await unlock(b)
  await b.keyboard.press('Escape')
  const row = b.locator('[data-testid^="library-row-"]').filter({ hasText: 'Shared retro' })
  await expect(row).toBeVisible({ timeout: 20_000 })
  await row.getByRole('link', { name: /Shared retro/ }).first().click()
  await expect(noteByText(b, 'Seen on the other computer')).toBeVisible({ timeout: 30_000 })
  await ctxA.close()
  await ctxB.close()
})


test('a sign-in that ended says "Sign in again", one click renews it silently, and the vault asks for its password again', async ({ page: p, context, request }) => {
  const account = newAccount()
  await asAccount(context, account)
  await p.goto('/new')
  await openSync(p)
  await signIn(p)
  await createVault(p)

  // Microsoft ended the sign-in (24 hours, or the person removed the app): the next pass says so, and waits.
  await remote(request, { action: 'expire', account })
  await remote(request, { action: 'revoke', account })
  await p.getByTestId('sync-now').click()
  await expect(status(p)).toHaveAttribute('data-status', 'sign-in-again', { timeout: 30_000 })
  await expect(p.getByTestId('sync-signin-again')).toBeVisible()
  expect((await axe(p).withTags(WCAG).analyze()).violations).toEqual([])

  await p.getByTestId('sync-signin-again').click()
  await expect(p.getByTestId('sync-section')).toBeVisible({ timeout: 30_000 })
  await unlock(p)
})

test('a renewal with no Microsoft session left goes on to the sign-in page by itself, and a refused sign-in changes nothing', async ({ page: p, context, request }) => {
  const account = newAccount()
  await asAccount(context, account)
  await p.goto('/new')
  await openSync(p)
  await signIn(p)
  await createVault(p)
  await remote(request, { action: 'expire', account })
  await remote(request, { action: 'revoke', account })
  await remote(request, { action: 'session', account, alive: false })
  await p.getByTestId('sync-now').click()
  await expect(status(p)).toHaveAttribute('data-status', 'sign-in-again', { timeout: 30_000 })
  // The silent attempt finds no session ("login_required"), then the page asks the person: the fake shows no page, it signs in.
  await p.getByTestId('sync-signin-again').click()
  await expect(p.getByTestId('sync-section')).toBeVisible({ timeout: 30_000 })
  await unlock(p)

  const second = newAccount()
  const ctx = await p.context().browser()!.newContext()
  await asAccount(ctx, second)
  const q = await ctx.newPage()
  await q.goto('/new')
  await openSync(q)
  await remote(request, { action: 'deny', error: 'access_denied' })
  await q.getByTestId('sync-onedrive-signin').click()
  await expect(q.getByTestId('sync-error')).toBeVisible({ timeout: 30_000 })
  await expect(q.getByTestId('sync-onedrive-signin')).toBeVisible()
  await expect(q.getByTestId('sync-shield')).toHaveCount(0)
  expect((await axe(q).withTags(WCAG).analyze()).violations).toEqual([])
  await ctx.close()
})

test('throttling is waited out, not reported: a 429 with Retry-After still ends in "Synced"', async ({ page: p, context, request }) => {
  const account = newAccount()
  await asAccount(context, account)
  await p.goto('/new')
  await openSync(p)
  await signIn(p)
  await createVault(p)
  await remote(request, { action: 'throttle', account, times: 2, seconds: 1 })
  await p.getByTestId('sync-now').click()
  await expect(status(p)).toHaveAttribute('data-status', 'synced', { timeout: 40_000 })
})

test('the provider is not offered where the deployment has no client id, and the folder keeps working', async ({ page: p }) => {
  await p.route('**/providers.json', (route) => route.fulfill({ json: {} }))
  // Firefox and WebKit have no folder picker: give this page one so the folder card is what is left to see.
  await p.addInitScript(() => { (window as unknown as Record<string, unknown>).showDirectoryPicker ??= async () => { throw new DOMException('stub', 'AbortError') } })
  await p.goto('/new')
  await openSync(p)
  await expect(p.getByTestId('sync-onedrive')).toHaveCount(0)
  await expect(p.getByTestId('sync-onedrive-signin')).toHaveCount(0)
  await expect(p.getByTestId('sync-choose')).toBeVisible()
})

test('a browser without the folder picker is offered OneDrive, and says what the folder needs', async ({ page: p }) => {
  await p.addInitScript(() => { delete (window as unknown as Record<string, unknown>).showDirectoryPicker })
  await p.goto('/new')
  await openSync(p)
  await expect(p.getByTestId('sync-onedrive-signin')).toBeVisible()
  await expect(p.getByTestId('sync-folder-unsupported')).toBeVisible()
  await expect(p.getByTestId('sync-choose')).toHaveCount(0)
  expect((await axe(p).withTags(WCAG).analyze()).violations).toEqual([])
})

test('the sign-in screens fit a 360 px phone without sideways scrolling', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } })
  const p = await ctx.newPage()
  await asAccount(ctx, newAccount())
  await p.goto('/new')
  await openSync(p)
  const fits = () => p.evaluate(() => {
    const section = document.querySelector('[data-testid="sync-section"]') as HTMLElement
    const box = section.getBoundingClientRect()
    return section.scrollWidth <= section.clientWidth + 1 && [...section.querySelectorAll<HTMLElement>('*')].every((e) => e.getBoundingClientRect().right <= box.right + 1)
  })
  expect(await fits()).toBe(true)
  await signIn(p)
  expect(await fits()).toBe(true)
  expect((await axe(p).withTags(WCAG).analyze()).violations).toEqual([])
  await ctx.close()
})
