/**
 * Retro report (change retro-report): everything a team keeps after the retro, computed on the
 * device from the board. No names beyond what the board already shows; anonymous authors are
 * aggregated under one bucket.
 */
import { type ActionItem, type ActionStatus, type PhaseKind, type Snapshot, type SnapshotNote, talkShares } from '@retroboard/domain'
import { type ColumnItem, buildColumnItems } from './column-items'
import { buildRanking, podium, type RankedItem } from './ranking'

export interface ReportColumn { id: string; title: string; items: ColumnItem[]; ideas: number; /** Hidden by the facilitator when the report is made (change column-visibility). */ hidden?: boolean }

export interface ReportPhase { kind: PhaseKind; plannedMs: number; actualMs: number | null }

export interface Report {
  title: string
  /** ISO date (YYYY-MM-DD) of the report. */
  date: string
  /** Counts hidden (secret vote not closed): no votes anywhere in the report. */
  votesHidden: boolean
  metrics: {
    participants: number
    ideas: number
    votes: number | null
    actions: number
    clusters: number
  }
  /** Ideas per author as shown on the board; null: anonymous ones, aggregated. Most first. */
  ideasPerAuthor: { author: string | null; ideas: number }[]
  podium: RankedItem[]
  columns: ReportColumn[]
  actions: ActionItem[]
  /** Carried-over actions and where they ended up. */
  carried: { total: number; byStatus: Partial<Record<ActionStatus, number>> }
  agenda: ReportPhase[] | null
  /** Talk time shares per shown name (anonymous aggregated), null when nobody had a turn. */
  talk: { label: string | null; ms: number; share: number }[] | null
  /** ROTI scores (1 to 5) of the team; null when nobody rated. */
  roti: { counts: number[]; total: number; average: number } | null
}

const sumVotes = (notes: readonly SnapshotNote[], s: Pick<Snapshot, 'groups'>): number =>
  notes.reduce((n, x) => n + (x.votes ?? 0), 0) + s.groups.reduce((n, g) => n + Math.max(0, (g.votes ?? 0) - notes.filter((x) => x.groupId === g.id).reduce((m, x) => m + (x.votes ?? 0), 0)), 0)

export function buildReport(s: Snapshot, date: Date): Report {
  const ranking = buildRanking(s)
  const votesHidden = ranking === null
  const byAuthor = new Map<string | null, number>()
  for (const n of s.notes) byAuthor.set(n.author, (byAuthor.get(n.author) ?? 0) + 1)
  const ideasPerAuthor = [...byAuthor].map(([author, ideas]) => ({ author, ideas }))
    .sort((a, b) => b.ideas - a.ideas || (a.author === null ? 1 : b.author === null ? -1 : a.author.localeCompare(b.author)))
  const carriedList = s.actions.filter((a) => a.carriedFrom !== null)
  const byStatus: Partial<Record<ActionStatus, number>> = {}
  for (const a of carriedList) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1
  const named = new Set(s.notes.map((n) => n.author).filter((a) => a !== null))
  return {
    title: s.settings.title,
    date: date.toISOString().slice(0, 10),
    votesHidden,
    metrics: {
      // People seen on the board: connected now, or named on an idea; at least the viewer.
      participants: Math.max(s.peers.length, named.size, 1),
      ideas: s.notes.length,
      votes: votesHidden ? null : sumVotes(s.notes, s),
      actions: s.actions.length,
      clusters: s.groups.filter((g) => s.notes.some((n) => n.groupId === g.id)).length,
    },
    ideasPerAuthor,
    podium: ranking ? podium(ranking) : [],
    columns: s.columns.map((c) => {
      const items = buildColumnItems(s, c.id, votesHidden ? 'time' : 'votes')
      return { id: c.id, title: c.title, items, ideas: s.notes.filter((n) => n.columnId === c.id).length, ...(c.hidden ? { hidden: true } : {}) }
    }),
    actions: s.actions,
    carried: { total: carriedList.length, byStatus },
    agenda: s.agenda ? s.agenda.phases.map((p) => ({ kind: p.kind, plannedMs: p.plannedMs, actualMs: p.actualMs ?? null })) : null,
    talk: (() => { const shares = talkShares(s.talk, s.now); return shares.length ? shares : null })(),
    roti: s.roti && s.roti.total > 0 && s.roti.average !== null ? { counts: s.roti.counts, total: s.roti.total, average: s.roti.average } : null,
  }
}
