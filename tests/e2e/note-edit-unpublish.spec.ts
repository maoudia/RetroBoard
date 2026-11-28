import { type Page, expect, test } from '@playwright/test'
import { envelopeAad, PROTOCOL_VERSION, parseLive } from '../../packages/protocol/src'
import { deriveContentKey, fromBase64Url, open, seal, toBase64Url, utf8 } from '../../packages/crypto/src'
import { addDraft, axe, column, columnId, createBoard, join, noteByText, publishNote, settle } from './helpers'

/**
 * Edit in the writing zone and unpublish (change note-edit-and-unpublish): a published idea is changed in the composer of its column,
 * or sent back to the draft stack of its author. The titles that start with "being edited mark" need a direct WebRTC link (focus is peer to peer).
 */

async function shareUrl(page: Page) {
  await page.getByTestId('btn-share').click()
  const url = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return url
}
const idOf = async (page: Page, text: string) => (await noteByText(page, text).first().getAttribute('data-testid'))!.replace('note-', '')
async function openMenu(page: Page, id: string) {
  // Menus need settle time (Firefox, WebKit): open and wait until the items are there.
  await expect(async () => {
    await page.getByTestId(`note-menu-${id}`).click()
    await expect(page.getByTestId(`edit-${id}`)).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 10_000 })
}
const tray = (page: Page, colId: string) => page.locator(`[data-drafts-of="${colId}"]`)

test.describe('edit in the writing zone', () => {
  test('the menu opens the idea in the composer; the others see the old text until the save', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(page, 0, 'Slow CI')
    await expect(noteByText(bob.page, 'Slow CI')).toBeVisible()
    const id = await idOf(page, 'Slow CI')
    const col = await columnId(page, 0)

    await openMenu(page, id)
    await page.getByTestId(`edit-${id}`).click()
    const field = page.getByTestId(`draft-${col}`)
    await expect(page.getByTestId(`edit-bar-${col}`)).toBeVisible()
    await expect(field).toHaveValue('Slow CI')
    await expect(field).toBeFocused()
    await expect(page.getByTestId('live-polite')).toContainText('Slow CI')
    // Save and Cancel replace the publish buttons.
    await expect(page.getByTestId(`edit-save-${col}`)).toBeDisabled()
    await expect(page.getByTestId(`compose-publish-${col}`)).toHaveCount(0)
    const found = (await axe(page).include(`[data-testid="writing-zone-${col}"]`).analyze()).violations.map((v) => v.id)
    expect(found).toEqual([])

    await field.fill('Slow CI pipeline')
    await page.getByTestId(`compose-colour-toggle-${col}`).click()
    await page.getByTestId(`compose-color-${col}-3`).click()
    // Nothing changed for the others yet, and the idea stays on the board with its text.
    await expect(noteByText(page, 'Slow CI').first()).toBeVisible()
    await expect(bob.page.locator('article.note', { hasText: 'Slow CI pipeline' })).toHaveCount(0)
    await expect(noteByText(bob.page, 'Slow CI')).toBeVisible()

    await page.getByTestId(`edit-save-${col}`).click()
    await expect(page.getByTestId(`edit-bar-${col}`)).toHaveCount(0)
    await expect(noteByText(bob.page, 'Slow CI pipeline')).toBeVisible()
    await expect(bob.page.getByTestId(`edited-${id}`)).toBeVisible()
    // The composer is a new draft again.
    await expect(field).toHaveValue('')
    await bob.ctx.close()
  })

  test('cancel leaves no trace and brings back the draft that was being typed', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keep me')
    const id = await idOf(page, 'Keep me')
    const col = await columnId(page, 0)
    await page.getByTestId(`draft-${col}`).fill('half written')
    await openMenu(page, id)
    await page.getByTestId(`edit-${id}`).click()
    await expect(page.getByTestId(`draft-${col}`)).toHaveValue('Keep me')
    await page.getByTestId(`draft-${col}`).fill('changed my mind')
    await page.getByTestId(`edit-cancel-${col}`).click()
    await expect(page.getByTestId(`edit-bar-${col}`)).toHaveCount(0)
    await expect(noteByText(page, 'Keep me')).toBeVisible()
    await expect(page.locator('article.note', { hasText: 'changed my mind' })).toHaveCount(0)
    await expect(page.getByTestId(`draft-${col}`)).toHaveValue('half written')
    await expect(page.getByTestId(`edited-${id}`)).toHaveCount(0)
    // Escape cancels too.
    await openMenu(page, id)
    await page.getByTestId(`edit-${id}`).click()
    await page.getByTestId(`draft-${col}`).press('Escape')
    await expect(page.getByTestId(`edit-bar-${col}`)).toHaveCount(0)
  })

  test('dragging the idea onto the writing zone opens it, and the zone says "Modifier ici"', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Drag me')
    const col = await columnId(page, 0)
    const note = noteByText(page, 'Drag me')
    await note.hover()
    await page.mouse.down()
    const zone = page.getByTestId(`writing-zone-${col}`)
    const box = (await zone.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
    await expect(page.getByTestId(`drop-edit-${col}`)).toHaveText('Modifier ici')
    await page.mouse.up()
    await expect(page.getByTestId(`edit-bar-${col}`)).toBeVisible()
    await expect(page.getByTestId(`draft-${col}`)).toHaveValue('Drag me')
    await expect(noteByText(page, 'Drag me')).toBeVisible()
    await settle(page)
  })

  test('someone else\'s idea has no Edit and no Back to my drafts, and dropping it on the writing zone does nothing', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(page, 0, 'Alice idea')
    await expect(noteByText(bob.page, 'Alice idea')).toBeVisible()
    const id = await idOf(bob.page, 'Alice idea')
    await noteByText(bob.page, 'Alice idea').locator('.text').hover()
    await bob.page.getByTestId(`note-menu-${id}`).click()
    await expect(bob.page.getByTestId(`create-action-${id}`)).toBeVisible()
    await expect(bob.page.getByTestId(`edit-${id}`)).toHaveCount(0)
    await expect(bob.page.getByTestId(`unpublish-${id}`)).toHaveCount(0)
    await bob.page.keyboard.press('Escape')
    const col = await columnId(bob.page, 0)
    await noteByText(bob.page, 'Alice idea').dragTo(bob.page.getByTestId(`writing-zone-${col}`))
    await expect(bob.page.getByTestId(`edit-bar-${col}`)).toHaveCount(0)
    await expect(noteByText(bob.page, 'Alice idea')).toBeVisible()
    await bob.ctx.close()
  })

  test('being edited mark: the others see a light mark while the idea is open in the composer, never a board event', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(page, 0, 'Marked idea')
    await expect(noteByText(bob.page, 'Marked idea')).toBeVisible()
    const id = await idOf(page, 'Marked idea')
    const col = await columnId(page, 0)
    await openMenu(page, id)
    await page.getByTestId(`edit-${id}`).click()
    await expect(bob.page.getByTestId(`being-edited-${id}`)).toBeVisible()
    await page.getByTestId(`edit-cancel-${col}`).click()
    await expect(bob.page.getByTestId(`being-edited-${id}`)).toHaveCount(0)
    await bob.ctx.close()
  })

  test('keyboard: the menu reaches Edit and the result is announced', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Keys only')
    const id = await idOf(page, 'Keys only')
    await page.locator('body').click({ position: { x: 5, y: 300 } })
    await page.getByTestId(`note-menu-${id}`).focus()
    await page.keyboard.press('Enter')
    const edit = page.getByTestId(`edit-${id}`)
    await expect(edit).toBeVisible()
    await edit.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId(`edit-bar-${await columnId(page, 0)}`)).toBeVisible()
    await expect(page.getByTestId('live-polite')).toContainText('Keys only')
  })
})

test.describe('unpublish', () => {
  test('a facilitator sends Bob\'s idea back to Bob\'s drafts, once, and Bob is told', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const url = await shareUrl(page)
    const bob = await join(browser, url, 'Bob')
    const carol = await join(browser, url, 'Carol')
    await publishNote(bob.page, 0, 'Slow CI')
    await expect(noteByText(page, 'Slow CI')).toBeVisible()
    await expect(noteByText(carol.page, 'Slow CI')).toBeVisible()
    const id = await idOf(page, 'Slow CI')
    const col = await columnId(page, 0)

    await openMenu(page, id)
    await expect(page.getByTestId(`unpublish-${id}`)).toContainText('auteur')
    await page.getByTestId(`unpublish-${id}`).click()
    // Someone else's idea: a confirmation first.
    await expect(page.getByTestId('confirm')).toBeVisible()
    await page.getByTestId('confirm').click()

    for (const p of [page, bob.page, carol.page]) await expect(noteByText(p, 'Slow CI')).toHaveCount(0)
    await expect(tray(bob.page, col).locator('li')).toHaveCount(1)
    await expect(tray(bob.page, col)).toContainText('Slow CI')
    await expect(bob.page.getByTestId('toasts').getByText('Alice a renvoyé votre idée dans vos brouillons')).toBeVisible()
    await expect(tray(page, col)).toHaveCount(0)
    await expect(tray(carol.page, col)).toHaveCount(0)

    // A reload folds the log again: still one draft, not two.
    await bob.page.reload()
    await expect(tray(bob.page, col).locator('li')).toHaveCount(1)
    // The draft is theirs again: it publishes like any other.
    await bob.page.locator(`[data-testid^="draft-publish-"]`).first().click()
    await expect(noteByText(page, 'Slow CI')).toBeVisible()
    await bob.ctx.close()
    await carol.ctx.close()
  })

  test('the author takes an idea back from the menu: it tops the stack, and Undo puts it on the board again', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(page, 0, 'Slow CI')
    await addDraft(page, 0, 'Older draft')
    await expect(noteByText(bob.page, 'Slow CI')).toBeVisible()
    const id = await idOf(page, 'Slow CI')
    const col = await columnId(page, 0)

    await openMenu(page, id)
    await page.getByTestId(`unpublish-${id}`).click()
    await expect(noteByText(page, 'Slow CI')).toHaveCount(0)
    await expect(noteByText(bob.page, 'Slow CI')).toHaveCount(0)
    await expect(tray(page, col).locator('li')).toHaveCount(2)
    await expect(tray(page, col).locator('li').first()).toContainText('Slow CI')
    await expect(tray(page, col).locator('li').nth(1)).toContainText('Older draft')
    await expect(page.getByTestId('live-polite')).toContainText('brouillons')
    // No notice for my own action beyond its own toast.
    await expect(page.getByText('a renvoyé votre idée')).toHaveCount(0)

    await page.getByTestId('undo-unpublish').click()
    await expect(noteByText(page, 'Slow CI')).toBeVisible()
    await expect(noteByText(bob.page, 'Slow CI')).toBeVisible()
    await expect(tray(page, col).locator('li')).toHaveCount(1)
    await expect(tray(page, col)).toContainText('Older draft')
    await bob.ctx.close()
  })

  test('dropping the idea on the draft stack sends it back', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Fly home')
    const col = await columnId(page, 0)
    await noteByText(page, 'Fly home').hover()
    await page.mouse.down()
    const stack = page.getByTestId(`drop-stack-${col}`)
    const zone = (await page.getByTestId(`writing-zone-${col}`).boundingBox())!
    await page.mouse.move(zone.x + zone.width / 2, zone.y + 20, { steps: 8 })
    await expect(stack).toHaveText('Remettre dans mes brouillons')
    const box = (await stack.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
    await page.mouse.up()
    await expect(noteByText(page, 'Fly home')).toHaveCount(0)
    await expect(tray(page, col)).toContainText('Fly home')
    await settle(page)
  })

  test('votes: the confirmation counts them, they go with the idea, and the cluster dissolves', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Voted idea')
    await publishNote(page, 0, 'Its mate')
    await noteByText(page, 'Voted idea').locator('[data-testid^="vote-"]').click()
    await noteByText(page, 'Its mate').dragTo(noteByText(page, 'Voted idea'))
    await expect(page.locator('.cluster .stack')).toBeVisible()
    await settle(page)
    // The cluster holds both ideas; open it and use the menu of the idea inside.
    await page.locator('.cluster .stack').first().click()
    const id = await idOf(page, 'Voted idea')
    await openMenu(page, id)
    await page.getByTestId(`unpublish-${id}`).click()
    await expect(page.getByRole('dialog', { name: 'Renvoyer cette idée en brouillon ?' })).toContainText('1 vote')
    await page.getByTestId('confirm').click()
    await expect(noteByText(page, 'Voted idea')).toHaveCount(0)
    await expect(page.locator('.cluster .stack')).toHaveCount(0)
    await expect(noteByText(page, 'Its mate')).toBeVisible()
  })

  test('once voting is closed a voted idea cannot go back, an idea without votes can', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Voted idea')
    await publishNote(page, 0, 'Quiet idea')
    await noteByText(page, 'Voted idea').locator('[data-testid^="vote-"]').click()
    await page.getByTestId('close-voting').click()
    await expect(page.getByTestId('voting-closed')).toBeAttached()
    const voted = await idOf(page, 'Voted idea')
    await openMenu(page, voted)
    await expect(page.getByTestId(`unpublish-${voted}`)).toBeDisabled()
    await expect(page.getByTestId(`unpublish-${voted}`)).toHaveAttribute('title', 'Le vote est clos.')
    await page.keyboard.press('Escape')
    const quiet = await idOf(page, 'Quiet idea')
    await openMenu(page, quiet)
    await expect(page.getByTestId(`unpublish-${quiet}`)).toBeEnabled()
    await page.getByTestId(`unpublish-${quiet}`).click()
    await expect(noteByText(page, 'Quiet idea')).toHaveCount(0)
    await expect(noteByText(page, 'Voted idea')).toBeVisible()
  })

  test('a locked board: Edit is disabled for the author with the reason, a facilitator can still edit, and nobody unpublishes', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(bob.page, 0, 'Locked idea')
    await expect(noteByText(page, 'Locked idea')).toBeVisible()
    const id = await idOf(page, 'Locked idea')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-lock').check()
    await page.keyboard.press('Escape')

    await expect(bob.page.getByTestId('btn-options')).toBeVisible()
    await noteByText(bob.page, 'Locked idea').locator('.text').hover({ force: true })
    await bob.page.getByTestId(`note-menu-${id}`).click()
    await expect(bob.page.getByTestId(`edit-${id}`)).toBeDisabled()
    await expect(bob.page.getByTestId(`edit-${id}`)).toHaveAttribute('title', 'Le board est verrouillé.')
    await expect(bob.page.getByTestId(`unpublish-${id}`)).toBeDisabled()
    await bob.page.keyboard.press('Escape')

    await openMenu(page, id)
    await expect(page.getByTestId(`edit-${id}`)).toBeEnabled()
    await expect(page.getByTestId(`unpublish-${id}`)).toBeDisabled()
    await expect(page.getByTestId(`unpublish-${id}`)).toHaveAttribute('title', 'Le board est verrouillé.')
    await page.getByTestId(`edit-${id}`).click()
    const col = await columnId(page, 0)
    await page.getByTestId(`draft-${col}`).fill('Locked idea, fixed')
    await page.getByTestId(`edit-save-${col}`).click()
    await expect(noteByText(bob.page, 'Locked idea, fixed')).toBeVisible()
    await bob.ctx.close()
  })

  test('undo of an unpublish and the facilitator restore from the history', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice', oneFacilitator: true })
    const bob = await join(browser, await shareUrl(page), 'Bob')
    await publishNote(bob.page, 0, 'Takes back')
    await expect(noteByText(page, 'Takes back')).toBeVisible()
    const id = await idOf(bob.page, 'Takes back')
    const col = await columnId(bob.page, 0)
    await openMenu(bob.page, id)
    await bob.page.getByTestId(`unpublish-${id}`).click()
    await expect(noteByText(page, 'Takes back')).toHaveCount(0)
    await expect(tray(bob.page, col)).toContainText('Takes back')

    // Undo: the idea is back as a new idea, its draft leaves the stack.
    await bob.page.getByTestId('btn-undo').click()
    await expect(noteByText(page, 'Takes back')).toBeVisible()
    await expect(tray(bob.page, col)).toHaveCount(0)

    // The facilitator sends it back, then restores the board from the history.
    const again = await idOf(page, 'Takes back')
    await openMenu(page, again)
    await page.getByTestId(`unpublish-${again}`).click()
    await page.getByTestId('confirm').click()
    await expect(noteByText(page, 'Takes back')).toHaveCount(0)
    await page.getByTestId('btn-history').click()
    const entry = page.getByTestId('history-entry').first()
    await expect(entry).toContainText('Alice a renvoyé « Takes back » en brouillon')
    await entry.getByTestId('history-restore').click()
    await page.getByTestId('confirm').click()
    await expect(noteByText(page, 'Takes back')).toBeVisible()
    await bob.ctx.close()
  })

  test('rolling update: "Back to my drafts" is hidden while a person present does not announce it', async ({ page, browser }) => {
    // Alice's relay socket answers as if Bob's client predates the command: his presence is re-sealed without the flag.
    const alice = await browser.newContext({ locale: 'fr-FR' })
    const a = await alice.newPage()
    let contentKey: Uint8Array | null = null
    await alice.routeWebSocket(/\/ws2/, (ws) => {
      const server = ws.connectToServer()
      ws.onMessage((m) => server.send(m))
      server.onMessage(async (m) => {
        const frame = typeof m === 'string' ? (JSON.parse(m) as { t: string; env?: { v: number; room: string; id: string; hlc: number; ct: string } }) : null
        if (!frame || frame.t !== 'eph' || !frame.env || !contentKey) { ws.send(m); return }
        const { env } = frame
        const head = { v: PROTOCOL_VERSION, room: env.room, id: env.id, hlc: env.hlc } as const
        const plain = await open(contentKey, fromBase64Url(env.ct)!, utf8(envelopeAad(head)))
        const live = plain ? parseLive(JSON.parse(new TextDecoder().decode(plain))) : null
        if (!live || live.t !== 'presence') { ws.send(m); return }
        const { unpublish: _drop, ...older } = live
        const ct = toBase64Url(await seal(contentKey, utf8(JSON.stringify(older)), utf8(envelopeAad(head))))
        ws.send(JSON.stringify({ t: 'eph', env: { ...env, ct } }))
      })
    })
    await createBoard(a, { template: 'start-stop-continue', name: 'Alice', keepShare: true })
    const url = await a.getByTestId('share-url').inputValue()
    await a.keyboard.press('Escape')
    const compact = /^#c=([A-Za-z0-9_-]{22})([A-Za-z0-9_-]{22})/.exec(new URL(url).hash)!
    contentKey = await deriveContentKey(fromBase64Url(compact[2]!)!, compact[1]!)
    await publishNote(a, 0, 'My idea')
    const id = await idOf(a, 'My idea')
    // Alone: the item is there.
    await openMenu(a, id)
    await expect(a.getByTestId(`unpublish-${id}`)).toBeVisible()
    await a.keyboard.press('Escape')
    // Bob joins with a current client, but Alice hears him as an older one.
    const bob = await join(browser, url, 'Bob')
    await expect(a.getByTestId('btn-participants')).toBeVisible()
    await expect(async () => {
      await a.keyboard.press('Escape')
      await a.getByTestId(`note-menu-${id}`).click()
      await expect(a.getByTestId(`edit-${id}`)).toBeVisible({ timeout: 1500 })
      await expect(a.getByTestId(`unpublish-${id}`)).toHaveCount(0, { timeout: 1500 })
    }).toPass({ timeout: 15_000 })
    // Edit stays, only the new command is held back.
    await expect(a.getByTestId(`edit-${id}`)).toBeVisible()
    await bob.ctx.close()
    await alice.close()
    void page
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('Edit opens the sheet in edit mode, and Back to my drafts fills the tray', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await publishNote(page, 0, 'Phone idea')
    const id = await idOf(page, 'Phone idea')
    const col = await columnId(page, 0)
    await openMenu(page, id)
    await page.getByTestId(`edit-${id}`).click()
    await expect(page.getByTestId('compose-sheet')).toBeVisible()
    await expect(page.getByTestId(`edit-bar-${col}`)).toBeVisible()
    await expect(page.getByTestId(`draft-${col}`)).toHaveValue('Phone idea')
    await page.getByTestId(`draft-${col}`).fill('Phone idea v2')
    await page.getByTestId(`edit-save-${col}`).click()
    await expect(page.getByTestId('compose-sheet')).toHaveCount(0)
    await expect(noteByText(page, 'Phone idea v2')).toBeVisible()

    await openMenu(page, id)
    await page.getByTestId(`unpublish-${id}`).click()
    await expect(noteByText(page, 'Phone idea v2')).toHaveCount(0)
    await expect(tray(page, col)).toContainText('Phone idea v2')
    void column
  })
})
