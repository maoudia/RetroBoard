import { buildColumnItems } from '@retroboard/application'
import type { Snapshot } from '@retroboard/domain'

/** Label provider, so exporters stay pure and language-agnostic. Keys are the `export.*` i18n keys. */
export type ExportLabels = (key: 'export.noNote' | 'export.votes' | 'export.actions' | 'export.noAction'
  | 'export.csv.column' | 'export.csv.group' | 'export.csv.note' | 'export.csv.votes' | 'export.csv.author',
params?: { n: number }) => string

export interface ExportMeta { date: Date; labels: ExportLabels }

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim()

export function toMarkdown(s: Snapshot, meta: ExportMeta): string {
  const t = meta.labels
  const secret = s.settings.secretVoting && !s.settings.votingClosed
  const lines: string[] = [`# ${s.settings.title}`, '', `_${meta.date.toISOString().slice(0, 10)}_`, '']
  for (const col of s.columns) {
    lines.push(`## ${col.title}`, '')
    const items = buildColumnItems(s, col.id, secret ? 'time' : 'votes')
    if (!items.length) lines.push(t('export.noNote'), '')
    const votes = (n: number) => (secret ? '' : ` (${t('export.votes', { n })})`)
    for (const it of items) {
      if (it.kind === 'note') {
        lines.push(`- ${oneLine(it.note.text)}${votes(it.votes)}${it.note.author ? ` - ${it.note.author}` : ''}`)
      } else {
        lines.push(`- **${oneLine(it.title)}**${votes(it.votes)}`)
        for (const n of it.notes) lines.push(`  - ${oneLine(n.text)}${n.author ? ` - ${n.author}` : ''}`)
      }
    }
    if (items.length) lines.push('')
  }
  lines.push(`## ${t('export.actions')}`, '')
  if (!s.actions.length) lines.push(t('export.noAction'))
  for (const a of s.actions) lines.push(`- [${a.done ? 'x' : ' '}] ${oneLine(a.text)}${a.owner ? ` (${a.owner})` : ''}`)
  return lines.join('\n') + '\n'
}

/** Quotes a CSV cell and neutralises spreadsheet formula injection. */
export function csvCell(v: string | number): string {
  let cell = String(v)
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`
  return `"${cell.replace(/"/g, '""')}"`
}

export function toCsv(s: Snapshot, labels: ExportLabels): string {
  const col = new Map(s.columns.map((c) => [c.id, c.title]))
  const group = new Map(s.groups.map((g) => [g.id, g]))
  const rows = [[labels('export.csv.column'), labels('export.csv.group'), labels('export.csv.note'), labels('export.csv.votes'), labels('export.csv.author')]]
  for (const n of s.notes) {
    const g = n.groupId ? group.get(n.groupId) : undefined
    rows.push([col.get(n.columnId) ?? '', g ? (g.title ?? '') : '', n.text, n.votes === null ? '' : String(n.votes), n.author ?? ''])
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}

/** Board content without per-viewer fields (mine, voted). */
export function toJson(s: Snapshot): string {
  const { settings, columns, notes, groups, actions } = s
  return JSON.stringify({ settings, columns, notes: notes.map(({ mine: _m, voted: _v, ...n }) => n), groups, actions }, null, 2)
}

/** Jira's default workflow names, so the file imports as-is (Jira > Import issues from CSV). */
const JIRA_STATUS = { todo: 'To Do', doing: 'In Progress', done: 'Done', blocked: 'Blocked', dropped: "Won't Do" } as const

/** Actions only, with the column names Jira's CSV importer maps by default. */
export function toActionsCsv(s: Pick<Snapshot, 'actions' | 'settings'>): string {
  const rows = [['Summary', 'Assignee', 'Status', 'Due Date', 'Labels']]
  for (const a of s.actions) rows.push([a.text, a.owner, JIRA_STATUS[a.status], a.due ?? '', `retro:${s.settings.title.replace(/\s+/g, '-')}`])
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}
export * from './report-html'
