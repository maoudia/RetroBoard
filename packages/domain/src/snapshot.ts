import type { AgendaState } from './facilitation/agenda'
import type { BoardState, Peer, Snapshot, SnapshotGroup, SnapshotNote } from './shared/types'
import { isFrozenNote } from './ideation/freeze'
import { rotiSummary } from './facilitation/roti'
import { clusterVoters, countOf, votability, votesUsedBy } from './voting/policy'

export interface Viewer {
  cid: string
}

/** Hidden columns come back when the agenda reaches the closing phase (or has ended). */
const closing = (a: AgendaState | null): boolean => !!a && a.current >= 0 && (a.current >= a.phases.length || a.phases[a.current]?.kind === 'close')

/** The only place where server state is turned into what a client may see. */
export function buildSnapshot(state: BoardState, viewer: Viewer, peers: Peer[], now: number, names: Readonly<Record<string, string>> = {}): Snapshot {
  // Hidden counts: only until the facilitator closes voting, then everyone sees them at once.
  const secret = state.settings.secretVoting && !state.settings.votingClosed
  const all = Object.values(state.notes)
  const notes: SnapshotNote[] = all
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      columnId: n.columnId,
      text: n.text,
      color: n.color,
      // A facilitator rename shows on notes that already carry a name; it never unmasks an anonymous author.
      author: n.author ? (names[n.ownerCid] ?? n.author) : n.author,
      groupId: n.groupId,
      votes: secret ? null : n.voters.length,
      voted: n.voters.includes(viewer.cid),
      myVotes: countOf(n.voters, viewer.cid),
      votable: votability(state, 'note', n.id) === null,
      mine: n.ownerCid === viewer.cid,
      createdAt: n.createdAt,
      ...(isFrozenNote(state, n.id) ? { frozen: true } : {}),
      ...(n.pinned ? { pinned: n.pinned } : {}),
    }))
  const groups: SnapshotGroup[] = Object.values(state.groups).map((g) => {
    const voters = clusterVoters(state, g.id)
    return {
      id: g.id, columnId: g.columnId, title: g.title,
      votes: secret ? null : voters.length,
      myVotes: countOf(g.voters, viewer.cid),
      votable: votability(state, 'cluster', g.id) === null,
      ...(g.frozen ? { frozen: true } : {}),
      ...(g.pinned ? { pinned: g.pinned } : {}),
    }
  })
  const used = votesUsedBy(state, viewer.cid)
  const t = state.timer
  const expired = t.running && t.endsAt <= now
  return {
    t: 'snapshot',
    now,
    settings: state.settings,
    columns: closing(state.agenda) ? state.columns.map(({ hidden: _h, ...c }) => c) : state.columns,
    notes,
    groups,
    actions: Object.values(state.actions).sort((a, b) => a.createdAt - b.createdAt),
    timer: expired ? { ...t, running: false, remaining: 0, endsAt: 0 } : t,
    agenda: state.agenda,
    talk: state.talk,
    reveal: state.reveal ?? null,
    roti: rotiSummary(state, viewer.cid),
    peers,
    votesLeft: Math.max(0, state.settings.voteLimit - used),
  }
}
