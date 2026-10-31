import { expect, type Page, test } from '@playwright/test'
import { createBoard, join, publishNote, voteMenu } from './helpers'

const shareLink = async (page: Page) => {
  await page.getByTestId('btn-share').click()
  const link = await page.getByTestId('share-url').inputValue()
  await page.keyboard.press('Escape')
  return link
}
type BoardStore = { columns: { id: string; title: string }[]; commands: { publish: (items: { columnId: string; text: string }[]) => void; setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void } }

test.describe('live regions (WCAG 4.1.3)', () => {
  test('a burst of notes from others is one polite message; own notes and the first load are silent', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await expect(page.getByTestId('live-polite')).toHaveAttribute('aria-live', 'polite')
    await expect(page.getByTestId('live-assertive')).toHaveAttribute('aria-live', 'assertive')
    await expect(page.getByTestId('live-polite')).toHaveText('')
    const bob = await join(browser, await shareLink(page), 'Bob')

    await publishNote(page, 0, 'My own note')
    await page.waitForTimeout(2000)
    await expect(page.getByTestId('live-polite')).toHaveText('')

    const column = await bob.page.evaluate(() => {
      const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__
      const b = app.config.globalProperties.$pinia._s.get('board') as unknown as BoardStore
      b.commands.publish([{ columnId: b.columns[0]!.id, text: 'one' }, { columnId: b.columns[0]!.id, text: 'two' }, { columnId: b.columns[0]!.id, text: 'three' }])
      return b.columns[0]!.title
    })
    await expect(page.getByTestId('live-polite')).toHaveText(`3 nouvelles idées dans ${column}`)
    await bob.ctx.close()
  })

  test('phase changes and the vote reveal are announced politely, without moving the focus', async ({ page, browser }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    const bob = await join(browser, await shareLink(page), 'Bob')
    await publishNote(page, 0, 'Reveal me')
    const profile = bob.page.getByTestId('btn-profile')
    await profile.focus()

    await page.evaluate(() => {
      const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__
      const b = app.config.globalProperties.$pinia._s.get('board') as unknown as BoardStore
      b.commands.setAgenda([{ kind: 'write', minutes: 5 }, { kind: 'vote', minutes: 5 }], { rules: true, autoPublish: false })
      b.commands.startAgenda()
    })
    await expect(bob.page.getByTestId('live-polite')).toContainText('Maintenant : Écriture')
    await page.getByTestId('agenda-ring').click()
    await page.getByTestId('agenda-next').click()
    await page.keyboard.press('Escape')
    await expect(bob.page.getByTestId('live-polite')).toContainText('Maintenant : Vote')
    await expect(profile).toBeFocused()

    await voteMenu(page, 'secret-toggle')
    await page.getByTestId('close-voting').click()
    await expect(bob.page.getByTestId('live-polite')).toContainText('Les votes sont révélés')
    await bob.ctx.close()
  })

  test('the end of a timer is announced assertively', async ({ page }) => {
    await page.clock.install()
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.evaluate(() => {
      const app = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, unknown> } } } } }).__vue_app__
      const b = app.config.globalProperties.$pinia._s.get('board') as unknown as BoardStore
      b.commands.setAgenda([{ kind: 'write', minutes: 1 }, { kind: 'group', minutes: 5 }], { rules: false, autoPublish: false })
      b.commands.startAgenda()
    })
    await expect(page.getByTestId('agenda-phase')).toHaveText('Écriture')
    await page.waitForTimeout(1200)
    await page.clock.fastForward(61_000)
    await expect(page.getByTestId('live-assertive')).toContainText('Le temps est écoulé pour Écriture')
    await expect(page.getByTestId('live-assertive')).toContainText('Suite : Regroupement')
  })
})
