import { t } from '~/i18n'
import type { Snapshot } from '~~/shared/domain/types'
import { buildColumnItems } from './layout'

export interface ExportMeta { date: Date }

const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim()

export function toMarkdown(s: Snapshot, meta: ExportMeta): string {
  const secret = s.settings.secretVoting
  const lines: string[] = [`# ${s.settings.title}`, '', `_${meta.date.toISOString().slice(0, 10)}_`, '']
  for (const col of s.columns) {
    lines.push(`## ${col.title}`, '')
    const items = buildColumnItems(s, col.id, secret ? 'time' : 'votes')
    if (!items.length) lines.push(t('export.noNote'), '')
    for (const it of items) {
      const votes = (n: number) => (secret ? '' : ` (${t('export.votes', { n })})`)
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

const csvCell = (v: string | number) => {
  let t = String(v)
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`
  return `"${t.replace(/"/g, '""')}"`
}

export function toCsv(s: Snapshot): string {
  const col = new Map(s.columns.map((c) => [c.id, c.title]))
  const group = new Map(s.groups.map((g) => [g.id, g]))
  const rows = [[t('export.csv.column'), t('export.csv.group'), t('export.csv.note'), t('export.csv.votes'), t('export.csv.author')]]
  for (const n of s.notes) {
    const g = n.groupId ? group.get(n.groupId) : undefined
    rows.push([col.get(n.columnId) ?? '', g ? (g.title ?? '') : '', n.text, n.votes === null ? '' : String(n.votes), n.author ?? ''])
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}

export function toJson(s: Snapshot): string {
  const { settings, columns, notes, groups, actions } = s
  return JSON.stringify({ settings, columns, notes: notes.map(({ mine: _m, voted: _v, ...n }) => n), groups, actions }, null, 2)
}

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
