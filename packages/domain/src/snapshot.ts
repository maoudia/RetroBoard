import type { BoardState, Peer, Snapshot, SnapshotNote } from './shared/types'

export interface Viewer {
  cid: string
}

/** The only place where server state is turned into what a client may see. */
export function buildSnapshot(state: BoardState, viewer: Viewer, peers: Peer[], now: number): Snapshot {
  const secret = state.settings.secretVoting
  const all = Object.values(state.notes)
  const notes: SnapshotNote[] = all
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      columnId: n.columnId,
      text: n.text,
      color: n.color,
      author: n.author,
      groupId: n.groupId,
      votes: secret ? null : n.voters.length,
      voted: n.voters.includes(viewer.cid),
      mine: n.ownerCid === viewer.cid,
      createdAt: n.createdAt,
    }))
  const used = all.filter((n) => n.voters.includes(viewer.cid)).length
  const t = state.timer
  const expired = t.running && t.endsAt <= now
  return {
    t: 'snapshot',
    now,
    settings: state.settings,
    columns: state.columns,
    notes,
    groups: Object.values(state.groups),
    actions: Object.values(state.actions).sort((a, b) => a.createdAt - b.createdAt),
    timer: expired ? { ...t, running: false, remaining: 0, endsAt: 0 } : t,
    peers,
    votesLeft: Math.max(0, state.settings.voteLimit - used),
  }
}
