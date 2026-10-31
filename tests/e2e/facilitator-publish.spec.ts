import { expect, test } from '@playwright/test'
import { createBoard } from './helpers'

type Store = { commands: { setAgenda: (p: unknown, o: unknown) => void; startAgenda: () => void; publish: (items: unknown[]) => { ok: boolean } }; columns: { id: string }[]; access: { bypassesPhase: boolean } }
const boardStore = `(document.getElementById('__nuxt')).__vue_app__.config.globalProperties.$pinia._s.get('board')`

test.describe('facilitator content outside the writing phase (#270, #276)', () => {
  test('the creator publishes a note while the phase is Group, with phase rules on', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
    await page.evaluate((src) => {
      const board = (0, eval)(src) as Store
      board.commands.setAgenda([{ kind: 'group', minutes: 5 }, { kind: 'vote', minutes: 5 }], { rules: true, autoPublish: false })
      board.commands.startAgenda()
    }, boardStore)
    await expect(page.getByTestId('agenda-phase')).toHaveText('Regroupement')

    const ok = await page.evaluate((src) => {
      const board = (0, eval)(src) as Store
      return board.commands.publish([{ columnId: board.columns[0]!.id, text: 'Facilitator note' }]).ok
    }, boardStore)
    expect(ok).toBe(true)
    await expect(page.getByTestId('note-text').filter({ hasText: 'Facilitator note' })).toHaveCount(1)
  })
})
