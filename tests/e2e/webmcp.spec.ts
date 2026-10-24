import { expect, type Page, test } from '@playwright/test'
import { collectProblems, createBoard, publishNote } from './helpers'

/**
 * A fake WebMCP model context (document.modelContext), shaped like the July 2026 draft.
 * Tests call tools the way a browser agent would.
 */
async function installFakeModelContext(page: Page) {
  await page.addInitScript(() => {
    type Tool = { name: string; annotations?: { readOnlyHint?: boolean }; execute: (input: unknown, client?: unknown) => Promise<{ content: { text: string }[] }> }
    const tools = new Map<string, Tool>()
    const ctx = {
      registerTool(tool: Tool) { tools.set(tool.name, tool) },
      unregisterTool(name: string) { tools.delete(name) },
    }
    Object.defineProperty(Document.prototype, 'modelContext', { configurable: true, get: () => ctx })
    const w = window as unknown as Record<string, unknown>
    w.__toolNames = () => [...tools.keys()].sort()
    w.__readOnly = (name: string) => tools.get(name)?.annotations?.readOnlyHint ?? null
    w.__call = async (name: string, input: unknown) => {
      const tool = tools.get(name)
      if (!tool) throw new Error(`no tool ${name}`)
      const out = await tool.execute(input)
      return JSON.parse(out.content[0]!.text) as unknown
    }
  })
}

const toolNames = (page: Page) => page.evaluate(() => (window as unknown as { __toolNames: () => string[] }).__toolNames())
const call = (page: Page, name: string, input: unknown = {}) =>
  page.evaluate(([n, i]) => (window as unknown as { __call: (n: string, i: unknown) => Promise<unknown> }).__call(n as string, i), [name, input] as const)

async function enableAgents(page: Page) {
  await page.getByTestId('btn-profile').click()
  await page.getByTestId('set-browser-agents').check()
  await page.keyboard.press('Escape')
}

test.describe('WebMCP browser agents', () => {
  test.beforeEach(async ({ page }) => { await installFakeModelContext(page) })

  test('no tool is registered until the participant opts in', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    expect(await toolNames(page)).toEqual([])
    await enableAgents(page)
    await expect.poll(() => toolNames(page)).toContain('retro_get_board')
    expect(await page.evaluate(() => (window as unknown as { __readOnly: (n: string) => boolean }).__readOnly('retro_list_ideas'))).toBe(true)
  })

  test('agent reads the board, drafts privately, and publishes only after human approval', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await enableAgents(page)
    await expect.poll(() => toolNames(page)).toContain('retro_write_draft')
    await publishNote(page, 0, 'Deploys are slow')

    const board = await call(page, 'retro_get_board') as { ok: boolean; data: { columns: { id: string }[] } }
    expect(board.ok).toBe(true)
    const ideas = await call(page, 'retro_list_ideas') as { data: { ideas: { text: string }[] } }
    expect(ideas.data.ideas.map((i) => i.text)).toContain('Deploys are slow')

    const columnId = board.data.columns[1]!.id
    expect(await call(page, 'retro_write_draft', { columnId, text: 'Pair on reviews' })).toMatchObject({ ok: true })
    await expect(page.locator('article.note', { hasText: 'Pair on reviews' })).toHaveCount(0)

    // Declined: nothing is published.
    const declined = call(page, 'retro_publish_drafts')
    await expect(page.getByTestId('agent-confirm-items')).toContainText('Pair on reviews')
    await page.getByTestId('agent-decline').click()
    expect(await declined).toMatchObject({ ok: false })
    await expect(page.locator('article.note', { hasText: 'Pair on reviews' })).toHaveCount(0)

    // Approved: published for everyone.
    const approved = call(page, 'retro_publish_drafts')
    await page.getByTestId('agent-approve').click()
    expect(await approved).toMatchObject({ ok: true, data: { published: 1 } })
    await expect(page.locator('article.note', { hasText: 'Pair on reviews' })).toHaveCount(1)
  })

  test('facilitator policy removes the tools', async ({ page }) => {
    await createBoard(page, { template: 'start-stop-continue' })
    await enableAgents(page)
    await expect.poll(() => toolNames(page)).toContain('retro_get_board')
    await page.getByTestId('btn-options').click()
    await page.getByTestId('opt-browser-agents').uncheck()
    await expect.poll(() => toolNames(page)).toEqual([])
  })

  test('setup tools prepare the creation form without creating a board', async ({ page }) => {
    await page.goto('/')
    await enableAgents(page)
    await expect.poll(() => toolNames(page)).toContain('retro_prepare_board')
    expect(await call(page, 'retro_prepare_board', { formatId: 'daki', title: 'Team Atlas - Sprint 43' })).toMatchObject({ ok: true })
    await expect(page).toHaveURL(/\/new/)
    await expect(page.getByTestId('setup-title')).toHaveValue('Team Atlas - Sprint 43')
    await page.getByTestId('tab-all').click()
    await expect(page.getByTestId('template-daki')).toHaveAttribute('aria-pressed', 'true')
  })
})

test('without native WebMCP, opting in loads the polyfill with no CSP or console error', async ({ page }) => {
  const errors = await collectProblems(page)
  await createBoard(page, { template: 'start-stop-continue' })
  expect(await page.evaluate(() => 'modelContext' in document || 'modelContext' in navigator)).toBe(false)
  await enableAgents(page)
  await expect.poll(() => page.evaluate(() => typeof (document as unknown as { modelContext?: unknown }).modelContext)).toBe('object')
  await page.waitForTimeout(300)
  expect(errors).toEqual([])
})
