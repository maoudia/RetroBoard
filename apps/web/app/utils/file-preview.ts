import { escapeHtml, REPORT_CSS } from '@retroboard/exporters'

/**
 * File preview before saving (change export-hub, task 2.3): the exact file the participant is about to
 * save, rendered for its format. Pure functions; the component only displays what they return.
 */
export interface StagedFile { name: string, mime: string, content: string, /** Not readable text (encrypted): name and size only. */ opaque?: boolean }

export type PreviewKind = 'html' | 'markdown' | 'table' | 'json' | 'jsonl' | 'text' | 'opaque'

export function previewKind(file: StagedFile): PreviewKind {
  if (file.opaque) return 'opaque'
  const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  if (ext === 'html') return 'html'
  if (ext === 'md') return 'markdown'
  if (ext === 'csv' || ext === 'tsv') return 'table'
  if (ext === 'json') return 'json'
  if (ext === 'jsonl') return 'jsonl'
  return 'text'
}

/** Bytes of the file as saved (UTF-8). */
export const fileSize = (content: string): number => new TextEncoder().encode(content).length

/** "812 B", "3.4 kB", "1.2 MB" (decimal units, like the file manager). */
export function formatSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} kB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}

/** Delimited text (CSV with quoted cells, TSV) as rows of cells; a quoted cell may hold the delimiter and line breaks. */
export function parseDelimited(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const endCell = () => { row.push(cell); cell = '' }
  const endRow = () => { endCell(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c !== '"') cell += c
      else if (text[i + 1] === '"') { cell += '"'; i++ }
      else quoted = false
    } else if (c === '"' && delimiter === ',' && cell === '') quoted = true
    else if (c === delimiter) endCell()
    else if (c === '\n') endRow()
    else if (c !== '\r') cell += c
  }
  if (cell !== '' || row.length) endRow()
  return rows
}

/** One JSON document per non-empty line; a line that is not JSON stays a string, so nothing is hidden. */
export function parseJsonLines(text: string): unknown[] {
  return text.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l) as unknown } catch { return l } })
}

const inline = (s: string): string => escapeHtml(s)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,])/g, '$1<em>$2</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>')

/**
 * The Markdown the exporters write, as HTML: headings, nested lists, task items, bold, emphasis, code,
 * code fences and front matter. Everything is escaped first, so the result is safe in a script-less frame.
 */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let depth = 0
  const closeLists = (to = 0) => { while (depth > to) { out.push('</ul>'); depth-- } }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    if (line === '---' || line.startsWith('```')) {
      // Front matter (--- ... ---) and code fences are shown as they are.
      const end = line === '---' ? '---' : '```'
      const body: string[] = []
      while (++i < lines.length && lines[i] !== end && !(end === '```' && lines[i]!.startsWith('```'))) body.push(lines[i]!)
      if (!(line === '---' && body.length === 0)) { closeLists(); out.push(`<pre>${escapeHtml(body.join('\n'))}</pre>`) }
      continue
    }
    const h = /^(#{1,6}) (.*)$/.exec(line)
    const li = /^( *)- (?:\[([ x])\] )?(.*)$/.exec(line)
    if (h) { closeLists(); out.push(`<h${h[1]!.length}>${inline(h[2]!)}</h${h[1]!.length}>`) }
    else if (li) {
      const level = Math.floor(li[1]!.length / 2) + 1
      while (depth < level) { out.push('<ul>'); depth++ }
      closeLists(level)
      const box = li[2] === undefined ? '' : `<span aria-hidden="true">${li[2] === 'x' ? '&#9745;' : '&#9744;'}</span> `
      out.push(`<li>${box}${inline(li[3]!)}</li>`)
    } else if (line.trim()) { closeLists(); out.push(`<p>${inline(line)}</p>`) }
    else closeLists()
  }
  closeLists()
  return out.join('\n')
}

/**
 * Document shown in the sandboxed preview frame. The stylesheet is the report's own (its hash is in the
 * Content-Security-Policy), so a report previews exactly as the saved file looks.
 */
export function frameDocument(kind: 'html' | 'markdown', content: string): string {
  if (kind === 'html') return content
  return `<!doctype html><html><head><meta charset="utf-8"><style>${REPORT_CSS}</style></head><body>${markdownToHtml(content)}</body></html>`
}
