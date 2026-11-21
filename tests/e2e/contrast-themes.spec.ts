import { expect, test } from '@playwright/test'
import { THEMES } from '../../packages/themes/src/index'
import { closeCompose, composeField, createBoard, join, lowContrast, settle } from './helpers'

/** Text that stays dark on dark (or light on light) in a state axe does not reach (#225): measured on every theme of the themes package, both variants. */

for (const variant of ['light', 'dark'] as const) {
  for (const { id: theme } of THEMES) {
    test(`contrast, ${theme}, ${variant} (#225)`, async ({ page, browser }) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: variant })
      await page.addInitScript((v) => { try { localStorage.setItem('retroboard:settings', JSON.stringify({ variant: v })) } catch { /* ignore */ } }, variant)
      await createBoard(page, { theme, template: 'start-stop-continue' })
      await (await composeField(page, 0)).fill('x'.repeat(150)) // the counter shows from 80% of the limit
      await settle(page)
      expect(await lowContrast(page)).toEqual([])
      // The locked board shows the lock pill and the vote bar controls in their disabled and pressed states.
      await page.evaluate(() => {
        const store = (document.getElementById('__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $pinia: { _s: Map<string, { commands: { updateSettings: (p: unknown) => void } }> } } } } }).__vue_app__.config.globalProperties.$pinia._s.get('board')!
        store.commands.updateSettings({ locked: true, secretVoting: true })
      })
      await settle(page)
      expect(await lowContrast(page)).toEqual([])
      await closeCompose(page) // on a phone the composer sheet and its scrim cover the toolbar
      // A toolbar panel (the filter bar) and the chat: a peer writes, so the toolbar shows the unread count, then the panel opens on the thread.
      await page.getByTestId('btn-filter').click()
      await expect(page.getByTestId('board-filter')).toBeVisible()
      await settle(page)
      expect(await lowContrast(page), 'filter panel').toEqual([])
      await page.getByTestId('filter-close').click()
      await page.getByTestId('btn-share').click()
      const link = await page.getByTestId('share-url').inputValue()
      await page.keyboard.press('Escape')
      const bob = await join(browser, link, 'Bob')
      await bob.page.getByTestId('btn-chat').click()
      await bob.page.getByTestId('chat-input').fill('Contrast check')
      await bob.page.getByTestId('chat-send').click()
      await expect(page.getByTestId('chat-unread')).toHaveText('1')
      await settle(page)
      expect(await lowContrast(page), 'chat unread count').toEqual([])
      await page.getByTestId('btn-chat').click()
      await expect(page.getByTestId('chat-log')).toContainText('Contrast check')
      await settle(page)
      expect(await lowContrast(page), 'chat panel').toEqual([])
      await bob.ctx.close()
    })
  }
}
