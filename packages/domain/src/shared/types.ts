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

export interface ActionItem {
  id: string
  text: string
  owner: string
  done: boolean
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
  secretVoting: boolean
  locked: boolean
  /** Facilitator policy: may participants let AI agents in their browser use this board (WebMCP)? */
  browserAgentsAllowed: boolean
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
  | 'last-column' | 'invalid' | 'same-column-required'

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
  /** null while secret voting hides counts. */
  votes: number | null
  voted: boolean
  mine: boolean
  createdAt: number
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
  groups: Group[]
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
