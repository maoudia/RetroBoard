import type { AgendaState } from '../facilitation/agenda'

export interface Column {
  id: string
  title: string
  subtitle: string
  icon: string
  /** Default sticky colour (index into the palette) of the notes written in this column. */
  color?: number
  /** Hidden by a facilitator for a while (change column-visibility). Shown again by the closing phase in the snapshot. */
  hidden?: boolean
  /** Votes are refused on this column when false (change column-voting-scope). Absent: votable, like boards created before. */
  votable?: boolean
}

export interface Group {
  id: string
  columnId: string
  /** null: the UI falls back to the first note's text, like RetroTool. */
  title: string | null
  /** Votes cast on the cluster as one idea (a client id per vote; repeats allowed). Never leaves the server. */
  voters: string[]
  /** Frozen by a facilitator: read only until unfrozen (change note-freeze). */
  frozen?: boolean
  /** Pinned at the top of its column: time of the pin, which is the pin order (change note-pin). */
  pinned?: number
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
  /** Frozen by a facilitator: read only until unfrozen (change note-freeze). */
  frozen?: boolean
  /** Pinned at the top of its column: time of the pin, which is the pin order (change note-pin). */
  pinned?: number
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
  /** Note or group the action was created from; cleared when that note or group is gone. */
  sourceNote?: string
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
  /** Talk time: off, a ring around the speaker, or start/finish popups. */
  talkMode: 'off' | 'ring' | 'popup'
  /** Budget of one speaking turn. */
  talkBudgetMs: number
  /** Participants may take the floor themselves. */
  talkSelfStart: boolean
  /** Set by `board.destroy`: the board is closed for good, every later event is ignored. */
  destroyed: boolean
  /** Arrivals and departures also pop up as toasts (always in the activity feed). Absent on older boards: on. */
  announceArrivals?: boolean
  /** Longest note text accepted, NOTE_TEXT_MIN..LIMITS.noteText (facilitator setting). */
  noteMaxLength: number
  /** Language the board was created in (board.init); absent on older boards. Picks the room words. */
  locale?: 'fr' | 'en'
}

export interface BoardState {
  settings: BoardSettings
  columns: Column[]
  notes: Record<string, NoteRecord>
  groups: Record<string, Group>
  actions: Record<string, ActionItem>
  timer: TimerState
  /** Time-boxed agenda, or null for a free-form retro (the plain timer). */
  agenda: AgendaState | null
  /** Speaking turns and time spoken per participant. */
  talk: TalkState
  /** "Reveal all": every client publishes its own drafts when the clock passes `endsAt`. */
  reveal?: { endsAt: number } | null
  /** ROTI scores 1..5 by participant id (change retro-report). */
  roti?: Record<string, number>
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
  | 'last-column' | 'invalid' | 'same-column-required' | 'voting-closed' | 'not-votable' | 'item-limit' | 'phase' | 'frozen'

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
  /** Frozen on its own or through its cluster: read only (change note-freeze). Absent when not frozen. */
  frozen?: boolean
  /** Pin order (time of the pin) when pinned at the top of the column (change note-pin). */
  pinned?: number
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
  frozen?: boolean
  pinned?: number
}

export interface Peer {
  name: string | null
  me: boolean
  /** Encrypted boards: role and session key of this participant (absent on legacy boards). */
  role?: 'facilitator' | 'co-facilitator' | 'participant'
  key?: string
  hidden?: boolean
  /** The facilitator set this display name (shown with a hint). */
  renamed?: boolean
  /** Relay connection id, to match live presence (cursors, focus). Not stable across reconnects. */
  conn?: string
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
  agenda: AgendaState | null
  /** Speaking turns and time spoken per participant. */
  talk: TalkState
  /** A "reveal all" countdown in progress or just over (server clock), or null. */
  reveal?: { endsAt: number } | null
  /** ROTI distribution and my own score (counts only, never who). */
  roti?: { counts: number[]; total: number; average: number | null; mine: number | null }
  peers: Peer[]
  votesLeft: number
  /** Encrypted boards: my role and whether I may steer. Absent on legacy boards (everyone steers). */
  access?: { role: 'facilitator' | 'co-facilitator' | 'participant'; canSteer: boolean; bypassesPhase: boolean; canManageRoles: boolean; /** This tab is the lead facilitator (one-facilitator boards). */ isLead: boolean }
}

export interface ServerError {
  t: 'error'
  error: ErrorCode
}
export type ServerMessage = Snapshot | ServerError

export interface TalkTurn {
  speaker: string
  /** Display name if the speaker shows it, else null (shown as "Anonymous"). */
  label: string | null
  startedAt: number
  budgetMs: number
}

/** Talk time (change talk-time): the active turn and the time spoken per speaker. */
export interface TalkState {
  active: TalkTurn | null
  /** Total time spoken per speaker, finished turns only. */
  totals: Record<string, { label: string | null; ms: number }>
}
