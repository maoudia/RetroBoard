/**
 * Carry-over of actions between retros: owner suggestions and parsers for the sources a
 * facilitator may import from (our JSON export, a CSV export from us or from Jira).
 * Pure: the adapters (file picker, team profile storage) live in the web app.
 */
import { type ActionStatusName, type ImportedAction, LIMITS } from '@retroboard/domain'

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

export interface OwnerSuggestion { name: string; source: 'present' | 'history' | 'custom' }

/**
 * Connected participants first, then owners used before, then the typed text ("Use 'Carla'")
 * when it matches nobody exactly. Matching ignores case and accents.
 */
export function suggestOwners(query: string, present: readonly string[], history: readonly string[], max = 8): OwnerSuggestion[] {
  const q = fold(query)
  const seen = new Set<string>()
  const out: OwnerSuggestion[] = []
  const add = (name: string, source: OwnerSuggestion['source']) => {
    const key = fold(name)
    if (!key || seen.has(key) || (q && !key.includes(q))) return
    seen.add(key)
    out.push({ name, source })
  }
  for (const n of present) add(n, 'present')
  for (const n of history) add(n, 'history')
  const list = out.slice(0, max - (query.trim() ? 1 : 0))
  const typed = query.trim().slice(0, LIMITS.actionOwner)
  if (typed && !seen.has(fold(typed))) list.push({ name: typed, source: 'custom' })
  return list
}

const STATUS_WORDS: Record<ActionStatusName, string[]> = {
  todo: ['todo', 'to do', 'open', 'backlog', 'a faire', 'ouvert', 'new'],
  doing: ['doing', 'in progress', 'en cours', 'started', 'in review'],
  done: ['done', 'closed', 'resolved', 'termine', 'fait', 'complete', 'completed'],
  blocked: ['blocked', 'bloque', 'on hold', 'waiting'],
  dropped: ['dropped', "won't do", 'wont do', 'abandonne', 'cancelled', 'canceled', 'rejected'],
}

/** Maps a status written by a person or another tool to ours; unknown means To do. */
export function mapStatus(raw: string | undefined | null): ActionStatusName {
  const v = fold(raw ?? '')
  for (const [status, words] of Object.entries(STATUS_WORDS)) if (words.includes(v)) return status as ActionStatusName
  return 'todo'
}

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',' || c === ';') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f.trim()))
}

/** Our CSV export protects formulas with a leading apostrophe: remove it on the way back. */
const unprotect = (v: string) => (/^'[=+\-@]/.test(v) ? v.slice(1) : v)
const DATE = /^\d{4}-\d{2}-\d{2}$/
const clean = (text: string, owner: string, status: ActionStatusName, due: string | undefined, from?: string): ImportedAction | null => {
  const t = unprotect(text).trim().slice(0, LIMITS.actionText)
  if (!t) return null
  const d = due?.trim().slice(0, 10)
  return { text: t, owner: unprotect(owner).trim().slice(0, LIMITS.actionOwner), status, ...(d && DATE.test(d) ? { due: d } : {}), ...(from ? { from: from.slice(0, LIMITS.boardTitle) } : {}) }
}

export interface CarryOverOptions { openOnly?: boolean; from?: string }
const finish = (items: (ImportedAction | null)[], o: CarryOverOptions) =>
  items.filter((i): i is ImportedAction => !!i && (!o.openOnly || (i.status !== 'done' && i.status !== 'dropped'))).slice(0, LIMITS.maxImport)

const HEADERS = {
  text: ['summary', 'action', 'actions', 'text', 'titre', 'resume', 'title'],
  owner: ['assignee', 'owner', 'responsable', 'porteur', 'who'],
  status: ['status', 'statut', 'state', 'etat'],
  due: ['due date', 'due', 'echeance', 'deadline'],
}

/** Actions from a CSV with a header row (ours, Jira, a spreadsheet). Null when no text column is found. */
export function actionsFromCsv(text: string, o: CarryOverOptions = {}): ImportedAction[] | null {
  const [head, ...rows] = parseCsv(text)
  if (!head) return null
  const idx = (names: string[]) => head.findIndex((h) => names.includes(fold(h)))
  const col = { text: idx(HEADERS.text), owner: idx(HEADERS.owner), status: idx(HEADERS.status), due: idx(HEADERS.due) }
  if (col.text < 0) return null
  return finish(rows.map((r) => clean(r[col.text] ?? '', r[col.owner] ?? '', mapStatus(r[col.status]), r[col.due], o.from)), o)
}

/** Actions from our JSON export (or a bare array of actions). Null when the shape is not recognised. */
export function actionsFromJson(text: string, o: CarryOverOptions = {}): ImportedAction[] | null {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return null }
  const list = Array.isArray(raw) ? raw : (raw as { actions?: unknown })?.actions
  if (!Array.isArray(list)) return null
  const from = o.from ?? (typeof (raw as { settings?: { title?: unknown } })?.settings?.title === 'string' ? (raw as { settings: { title: string } }).settings.title : undefined)
  return finish(list.map((a: Record<string, unknown>) => {
    if (!a || typeof a.text !== 'string') return null
    const status = typeof a.status === 'string' ? mapStatus(a.status) : a.done === true ? 'done' : 'todo'
    return clean(a.text, typeof a.owner === 'string' ? a.owner : '', status, typeof a.due === 'string' ? a.due : undefined, from)
  }), { ...o, from })
}
