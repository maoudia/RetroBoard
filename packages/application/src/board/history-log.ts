/**
 * History of reversible board actions and rewind (change board-undo-rewind), read from the signed
 * event log. Nothing is stored: the log is the history, a rewind is a batch of ordinary commands.
 */
import { type Actor, type BoardState, type Command, emptyLedger, foldEvent, reduce, type VerifiedEvent } from '@retroboard/domain'
import type { UndoLabel } from './history'

export const HISTORY_MAX = 50
/** A rewind is sent as ordinary events, and one author may only fold 60 events per 10 s window. */
export const REWIND_MAX_COMMANDS = 50
const TEXT_MAX = 140

export interface HistoryEntry {
  /** Id of the event: what a rewind restores the state before. */
  id: string
  at: number
  /** Signing key of the author. */
  key: string
  /** Display name when the author chose to show it, else null (anonymous). */
  by: string | null
  kind: UndoLabel
  /** The idea (or cluster title) concerned, so the panel can show what changed. */
  text: string
  /** Column of the idea, so the panel hides what a hidden column hides. */
  columnId: string
}

export interface RewindPlan {
  commands: Command[]
  /** Things the rewind leaves as they are: voted clusters, ideas whose column is gone, what the board refuses. */
  skipped: number
  /** Too many commands to send at once (the fold rate limit). Nothing should be sent. */
  tooMany: boolean
}

interface Record extends HistoryEntry { before: BoardState }

const KIND = { 'note.move': 'move', 'note.group': 'group', 'note.ungroup': 'ungroup', 'note.edit': 'edit', 'note.delete': 'delete', 'note.color': 'color', 'group.rename': 'rename' } as const satisfies Partial<globalThis.Record<Command['t'], UndoLabel>>
type ReversibleCommand = Extract<Command, { t: keyof typeof KIND }>
const isReversible = (cmd: Command): cmd is ReversibleCommand => cmd.t in KIND

/** What an action was about: a cluster rename shows the cluster title, anything else the idea (a deleted one as it was). */
function subjectOf(cmd: ReversibleCommand, before: BoardState, after: BoardState): { text: string; columnId: string } {
  if (cmd.t === 'group.rename') {
    const g = after.groups[cmd.id] ?? before.groups[cmd.id]
    return { text: g?.title ?? before.groups[cmd.id]?.title ?? '', columnId: g?.columnId ?? '' }
  }
  const n = (cmd.t === 'note.delete' ? before : after).notes[cmd.id]
  return { text: n?.text ?? '', columnId: n?.columnId ?? '' }
}

function scan(roomId: string, events: readonly VerifiedEvent[], max: number): { records: Record[]; board: BoardState } {
  let ledger = emptyLedger(roomId)
  const records: Record[] = []
  for (const e of events) {
    const next = foldEvent(ledger, e)
    if (next.ok && e.body.t === 'cmd' && isReversible(e.body.cmd) && next.ledger.board !== ledger.board) {
      const cmd = e.body.cmd
      const { text, columnId } = subjectOf(cmd, ledger.board, next.ledger.board)
      records.push({ id: e.id, at: e.at, key: e.author, by: e.body.showName && e.body.name ? e.body.name : null, kind: KIND[cmd.t], text: text.slice(0, TEXT_MAX), columnId, before: ledger.board })
      if (records.length > max) records.shift()
    }
    ledger = next.ledger
  }
  return { records, board: ledger.board }
}

/** The last reversible actions, newest last. Ignored events (hidden author, refused command) and no-ops leave no entry. */
export function historyOf(roomId: string, events: readonly VerifiedEvent[], max = HISTORY_MAX): HistoryEntry[] {
  return scan(roomId, events, max).records.map(({ before: _before, ...entry }) => entry)
}

/** The commands that put the board structure back as it was before the entry, or null when the entry is unknown. */
export function rewindPlan(roomId: string, events: readonly VerifiedEvent[], entryId: string): RewindPlan | null {
  const { records, board } = scan(roomId, events, Number.MAX_SAFE_INTEGER)
  const record = records.find((r) => r.id === entryId)
  return record ? restoreCommands(record.before, board) : null
}

const RESTORER: Actor = { cid: 'rewind', name: null, showName: false, moderator: true }

/**
 * Commands that bring `now` back to the text, colour, column, cluster membership and cluster title of `target`, for the
 * ideas that exist in both. Votes and chat are never rewound, ideas written since are left alone, a deleted
 * idea comes back as a new one (text, colour, column; its votes, cluster and author are gone with the delete), and a voted
 * cluster is never taken apart.
 * Each command is checked against a simulated board, so the plan only holds what the board will accept.
 */
export function restoreCommands(target: BoardState, now: BoardState): RewindPlan {
  const commands: Command[] = []
  let skipped = 0
  let work = now
  let seq = 0
  const apply = (cmd: Command): boolean => {
    const out = reduce(work, cmd, RESTORER, { now: 0, newId: () => `rewind${seq++}` })
    if (!out.ok) { skipped++; return false }
    work = out.state
    commands.push(cmd)
    return true
  }
  const common = Object.values(target.notes).filter((n) => now.notes[n.id]).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  const columnExists = (id: string) => work.columns.some((c) => c.id === id)

  for (const t of common) {
    if (work.notes[t.id]!.text !== t.text) apply({ t: 'note.edit', id: t.id, text: t.text })
    if (work.notes[t.id]!.color !== t.color) apply({ t: 'note.color', id: t.id, color: t.color })
  }

  const members = (s: BoardState, gid: string | null) => (gid ? common.filter((n) => s.notes[n.id]!.groupId === gid).map((n) => n.id) : [])
  const key = (ids: string[]) => (ids.length >= 2 ? ids.join(',') : '')
  const targetKey = (id: string) => key(members(target, target.notes[id]!.groupId))
  const nowKey = (id: string) => key(members(work, work.notes[id]!.groupId))
  const voted = (gid: string | null) => !!gid && (work.groups[gid]?.voters.length ?? 0) > 0

  // A cluster that only changed column goes back whole, so its title and votes stay.
  for (const gid of Object.keys(work.groups)) {
    const ids = members(work, gid)
    const first = ids[0]
    if (!first || key(ids) === '' || key(ids) !== targetKey(first)) continue
    const column = target.notes[first]!.columnId
    if (work.groups[gid]!.columnId !== column && columnExists(column)) apply({ t: 'group.move', id: gid, columnId: column })
  }
  // Take apart what is grouped differently, unless the cluster carries votes.
  for (const t of common) {
    const n = work.notes[t.id]!
    if (!n.groupId || nowKey(t.id) === targetKey(t.id)) continue
    if (voted(n.groupId)) skipped++
    else apply({ t: 'note.ungroup', id: t.id })
  }
  // Columns. Moving an idea takes it out of its cluster, which the next step rebuilds.
  for (const t of common) {
    const n = work.notes[t.id]!
    if (n.columnId === t.columnId) continue
    if (!columnExists(t.columnId) || voted(n.groupId)) skipped++
    else apply({ t: 'note.move', id: t.id, columnId: t.columnId })
  }
  // Rebuild the clusters of the target (their title is not restored: the new cluster has a new id).
  for (const gid of Object.keys(target.groups)) {
    const ids = members(target, gid)
    const anchor = ids[0]
    if (!anchor || ids.length < 2) continue
    for (const id of ids.slice(1)) {
      const group = work.notes[id]!.groupId
      if (group !== null && group === work.notes[anchor]!.groupId) continue
      if (voted(group)) skipped++
      else apply({ t: 'note.group', id, ontoId: anchor })
    }
  }
  // A deleted idea comes back as a new one, unless an idea written since already says the same (a second rewind).
  const since = Object.values(work.notes).filter((n) => !target.notes[n.id])
  const deleted = Object.values(target.notes).filter((n) => !now.notes[n.id]).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  for (const t of deleted) {
    const twin = since.findIndex((n) => n.text === t.text && n.color === t.color)
    if (twin >= 0) { since.splice(twin, 1); continue }
    if (!columnExists(t.columnId)) { skipped++; continue }
    apply({ t: 'note.add', columnId: t.columnId, text: t.text, color: t.color })
  }
  // Titles come back for clusters that kept their id and their ideas (a rebuilt cluster has a new id the plan cannot know).
  for (const gid of Object.keys(target.groups)) {
    const kept = work.groups[gid]
    if (!kept || (kept.title ?? '') === (target.groups[gid]!.title ?? '')) continue
    const ids = members(target, gid)
    if (ids.length >= 2 && key(ids) === key(members(work, gid))) apply({ t: 'group.rename', id: gid, title: target.groups[gid]!.title ?? '' })
  }
  return { commands, skipped, tooMany: commands.length > REWIND_MAX_COMMANDS }
}
