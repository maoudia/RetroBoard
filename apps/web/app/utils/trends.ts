import { buildTrends, retroStatsOf, type Trends, type Workspace } from '@retroboard/application'
import type { Snapshot } from '@retroboard/domain'

/** This retro against the previous ones of its team (change results-trends); null when there is nothing to compare with. */
export function trendsFor(ws: Workspace, boardId: string, snapshot: Snapshot): Trends | null {
  const teamId = ws.boards[boardId]?.teamId ?? ws.teams.find((t) => t.id === ws.lastTeamId)?.id ?? ws.teams[0]?.id
  return teamId ? buildTrends(ws, teamId, { boardId, stats: retroStatsOf(snapshot), actions: snapshot.actions }) : null
}
