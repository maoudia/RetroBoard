export interface Column {
  id: string
  title: string
  subtitle: string
  icon: string
}

export interface Group {
  id: string
  columnId: string
  /** null: the UI falls back to the first note's text, like RetroTool. */
  title: string | null
  /** Votes cast on the cluster as one idea (a client id per vote; repeats allowed). Never leaves the server. */
  voters: string[]
}

export interface NoteRecord {
  id: string
  columnId: string
  text: string
  /** Index into the theme note palette. */
  color: number
  /** Display name chosen by the author, or null for anonymous. */
  author: string | null
  /** Never leaves the server. */
  ownerCid: string
  groupId: string | null
  /** Client ids that voted. Never leaves the server. */
  voters: string[]
  createdAt: number
}

export type ActionStatus = 'todo' | 'doing' | 'done' | 'blocked' | 'dropped'

export interface ActionStatusChange {
  status: ActionStatus
  at: number
}

export interface ActionItem {
  id: string
  text: string
  owner: string
  /** Kept equal to status === 'done' for checkbox mode and older clients. */
  done: boolean
  status: ActionStatus
  /** Status changes, oldest first (the creation status included). */
  history: ActionStatusChange[]
  /** ISO date (YYYY-MM-DD) or null. */
  due: string | null
  /** Carried over from a previous retro: its title, else null. */
  carriedFrom: string | null
  createdAt: number
}

export interface TimerState {
  running: boolean
  /** Epoch ms (server clock) when the timer ends, if running. */
  endsAt: number
  /** Remaining ms when paused or idle. */
  remaining: number
  /** Last configured length, used by reset. */
  length: number
}

export interface BoardSettings {
  title: string
  voteLimit: number
  /** Votes one person may put on the same item (1 to voteLimit). */
  maxVotesPerItem: number
  /** What can be voted on. With clusters votable, notes inside a cluster are not voted separately. */
  votable: 'notes' | 'clusters' | 'both'
  /** Counts hidden from everyone but their own votes until voting closes ("hidden counts"). */
  secretVoting: boolean
  /** Voting phase over: no more votes, hidden counts are revealed to everyone at once. */
  votingClosed: boolean
  locked: boolean
  /** Facilitator policy: may participants let AI agents in their browser use this board (WebMCP)? */
  browserAgentsAllowed: boolean
  /** Action status: a checkbox, or the workflow To do, In progress, Done, Blocked, Dropped. */
  actionMode: 'checkbox' | 'workflow'
  /** Facilitation open to everyone: privileged commands are accepted from any participant (encrypted boards). */
  openFacilitation: boolean
  themeId: string
  templateId: string | null
  /** False until the first participant picks a template and theme (board.init). */
  initialized: boolean
}

export interface BoardState {
  settings: BoardSettings
  columns: Column[]
  notes: Record<string, NoteRecord>
  groups: Record<string, Group>
  actions: Record<string, ActionItem>
  timer: TimerState
}

export interface Actor {
  cid: string
  name: string | null
  showName: boolean
}

export interface ReduceContext {
  now: number
  newId: () => string
}

/** What changed, so the repository only writes what it must. */
export interface Dirty {
  meta: boolean
  notes: string[]
  groups: string[]
  actions: string[]
  /** Delete everything before writing (template switch, reset). */
  wipe: boolean
}

export type ErrorCode =
  | 'locked' | 'not-found' | 'forbidden' | 'vote-limit' | 'limit-reached' | 'not-empty'
  | 'last-column' | 'invalid' | 'same-column-required' | 'voting-closed' | 'not-votable' | 'item-limit'

export type Outcome =
  | { ok: true; state: BoardState; dirty: Dirty }
  | { ok: false; error: ErrorCode }

/** What a client receives. Voter identities, owner ids and secret counts are removed. */
export interface SnapshotNote {
  id: string
  columnId: string
  text: string
  color: number
  author: string | null
  groupId: string | null
  /** null while hidden counts hide them. */
  votes: number | null
  voted: boolean
  /** How many of my votes are on this note. */
  myVotes: number
  /** False when the note cannot get votes (inside a votable cluster, or notes not votable). */
  votable: boolean
  mine: boolean
  createdAt: number
}

/** A cluster as clients see it: counts only, never voter ids. */
export interface SnapshotGroup {
  id: string
  columnId: string
  title: string | null
  /** Cluster score: its own votes plus votes its notes received; null while counts are hidden. */
  votes: number | null
  myVotes: number
  votable: boolean
}

export interface Peer {
  name: string | null
  me: boolean
  /** Encrypted boards: role and session key of this participant (absent on legacy boards). */
  role?: 'facilitator' | 'co-facilitator' | 'participant'
  key?: string
  hidden?: boolean
}

export interface Snapshot {
  t: 'snapshot'
  /** Server clock, to compensate client clock skew for the timer. */
  now: number
  settings: BoardSettings
  columns: Column[]
  notes: SnapshotNote[]
  groups: SnapshotGroup[]
  actions: ActionItem[]
  timer: TimerState
  peers: Peer[]
  votesLeft: number
  /** Encrypted boards: my role and whether I may steer. Absent on legacy boards (everyone steers). */
  access?: { role: 'facilitator' | 'co-facilitator' | 'participant'; canSteer: boolean; canManageRoles: boolean }
}

export interface ServerError {
  t: 'error'
  error: ErrorCode
}
export type ServerMessage = Snapshot | ServerError
