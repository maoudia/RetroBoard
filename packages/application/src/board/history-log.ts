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
  /** The idea concerned, so the panel can show what changed. */
  text: string
  /** Column of the idea, so the panel hides what a hidden column hides. */
  columnId: string
}

export interface RewindPlan {
  commands: Command[]
  /** Things the rewind leaves as they are: deleted ideas, voted clusters, columns that no longer exist. */
  skipped: number
  /** Too many commands to send at once (the fold rate limit). Nothing should be sent. */
  tooMany: boolean
}

interface Record extends HistoryEntry { before: BoardState }

const KIND = { 'note.move': 'move', 'note.group': 'group', 'note.ungroup': 'ungroup', 'note.edit': 'edit', 'note.delete': 'delete', 'note.color': 'color' } as const satisfies Partial<globalThis.Record<Command['t'], UndoLabel>>
type ReversibleCommand = Extract<Command, { t: keyof typeof KIND }>
const isReversible = (cmd: Command): cmd is ReversibleCommand => cmd.t in KIND

function scan(roomId: string, events: readonly VerifiedEvent[], max: number): { records: Record[]; board: BoardState } {
  let ledger = emptyLedger(roomId)
  const records: Record[] = []
  for (const e of events) {
    const next = foldEvent(ledger, e)
    if (next.ok && e.body.t === 'cmd' && isReversible(e.body.cmd) && next.ledger.board !== ledger.board) {
      const cmd = e.body.cmd
      const note = (cmd.t === 'note.delete' ? ledger.board : next.ledger.board).notes[cmd.id]
      records.push({ id: e.id, at: e.at, key: e.author, by: e.body.showName && e.body.name ? e.body.name : null, kind: KIND[cmd.t], text: (note?.text ?? '').slice(0, TEXT_MAX), columnId: note?.columnId ?? '', before: ledger.board })
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
 * Commands that bring `now` back to the text, colour, column and cluster membership of `target`, for the
 * ideas that exist in both. Votes and chat are never rewound, ideas written since are left alone, a deleted
 * idea does not come back (it would lose its author and votes), and a voted cluster is never taken apart.
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
  skipped += Object.keys(target.notes).length - common.length
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
  return { commands, skipped, tooMany: commands.length > REWIND_MAX_COMMANDS }
}
