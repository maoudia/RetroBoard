import { expect, test } from '@playwright/test'
import { createBoard, publishNote } from './helpers'

// Two past retros of the team, saved on this device with their figures (change results-trends).
const workspace = {
  teams: [{ id: 'team-a', name: 'Alpha', emoji: '🚀', color: '#e8590c' }],
  lastTeamId: 'team-a',
  retros: [
    { boardId: 'old-1', teamId: 'team-a', project: null, title: 'Sprint 40', at: 1_000, stats: { participants: 5, keywords: ['reunions'] }, actions: [{ text: 'Fix CI', owner: 'Ana', status: 'todo' }] },
    { boardId: 'old-2', teamId: 'team-a', project: null, title: 'Sprint 41', at: 2_000, stats: { participants: 3, keywords: ['reunions', 'deploy'] }, actions: [{ text: 'Fix CI', owner: 'Ana', status: 'done' }, { text: 'Write docs', owner: 'Zed', status: 'dropped' }] },
  ],
  boards: {},
  owners: [],
}

test('results compare participation, actions done and recurring topics with the previous retros of the team (change results-trends)', async ({ page }) => {
  await page.addInitScript((ws) => { if (!localStorage.getItem('retroboard:workspace')) localStorage.setItem('retroboard:workspace', JSON.stringify(ws)) }, workspace)
  await createBoard(page, { template: 'start-stop-continue', name: 'Alice' })
  await publishNote(page, 0, 'Reunions trop longues')
  await publishNote(page, 0, 'Reunions sans ordre du jour')
  await publishNote(page, 1, 'Moins de reunions')
  const votes = page.locator('[data-testid^="vote-"]')
  await votes.nth(0).click()
  await page.getByTestId('close-voting').click()
  await page.getByTestId('open-ranking').click()
  await expect(page.getByTestId('trends')).toBeVisible()
  // Alice alone against three people at the previous retro.
  await expect(page.getByTestId('trend-participation.down')).toContainText('1')
  await expect(page.getByTestId('trend-actions')).toContainText('Sprint 41')
  await expect(page.getByTestId('trend-actions')).toContainText('1')
  await expect(page.getByTestId('trend-recurring')).toContainText('reunions')
})
