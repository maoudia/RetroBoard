import { inflateSync } from 'node:zlib'

/**
 * Text and structure of a PDF printed by Chromium (Skia): enough to prove what a print render contains
 * without a PDF library. Objects are plain (no object streams), page content is Flate-compressed and
 * the text is glyph codes that each font's ToUnicode map turns back into characters.
 */
export interface PdfContent {
  /** Page boxes (width x height in points), one per page. */
  pages: { width: number, height: number }[]
  /** Text per page, lines in reading order. */
  text: string[]
  /** Structure tags of the tagged PDF (Table, TH, TR...), in document order. */
  tags: string[]
}

const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1')

function objects(pdf: Buffer): Map<number, { dict: string, stream: string | null }> {
  const src = latin1(pdf)
  const out = new Map<number, { dict: string, stream: string | null }>()
  for (const m of src.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) {
    const body = m[2]!
    const at = body.indexOf('stream')
    if (at < 0) { out.set(Number(m[1]), { dict: body, stream: null }); continue }
    const dict = body.slice(0, at)
    let data = Buffer.from(body.slice(at + 6).replace(/^\r?\n/, '').replace(/\r?\nendstream\s*$/, ''), 'latin1')
    if (/\/FlateDecode/.test(dict)) { try { data = inflateSync(data) } catch { /* keep raw */ } }
    out.set(Number(m[1]), { dict, stream: latin1(data) })
  }
  return out
}

/** ToUnicode CMap: glyph code (hex) to the text it stands for. */
function cmap(stream: string): Map<string, string> {
  const map = new Map<string, string>()
  const uni = (hex: string) => String.fromCodePoint(...(hex.match(/.{4}/g) ?? []).map((h) => parseInt(h, 16)))
  for (const block of stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(m[1]!.toUpperCase(), uni(m[2]!))
  }
  for (const block of stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1]!.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const width = m[1]!.length
      const first = parseInt(m[1]!, 16)
      const last = parseInt(m[2]!, 16)
      const base = parseInt(m[3]!, 16)
      for (let c = first; c <= last; c++) map.set(c.toString(16).toUpperCase().padStart(width, '0'), String.fromCodePoint(base + c - first))
    }
  }
  return map
}

export function readPdf(pdf: Buffer): PdfContent {
  const objs = objects(pdf)
  const fonts = new Map<string, Map<string, string>>()
  for (const [, o] of objs) {
    for (const m of o.dict.matchAll(/\/(F\d+) (\d+) 0 R/g)) {
      const font = objs.get(Number(m[2]))
      const to = font?.dict.match(/\/ToUnicode (\d+) 0 R/)
      const map = to ? objs.get(Number(to[1]))?.stream : null
      if (map) fonts.set(m[1]!, cmap(map))
    }
  }
  const pages: PdfContent['pages'] = []
  const text: string[] = []
  const tags: string[] = []
  for (const [, o] of objs) {
    const box = o.dict.match(/\/Type \/Page\b[\s\S]*?\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/) ?? o.dict.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\][\s\S]*?\/Type \/Page\b/)
    if (box && !/\/Type \/Pages\b/.test(o.dict)) pages.push({ width: Math.round(Number(box[1])), height: Math.round(Number(box[2])) })
    if (!o.stream || !/\bBT\b/.test(o.stream)) continue
    let font = new Map<string, string>()
    const lines: string[] = []
    let line = ''
    for (const tok of o.stream.matchAll(/\/(\w+) <<\/MCID \d+ >>BDC|\/(F\d+) [\d.]+ Tf|<([0-9a-fA-F]+)> Tj|(\bBT\b)|(\bET\b)|\[([^\]]*)\] TJ/g)) {
      if (tok[1]) tags.push(tok[1])
      else if (tok[2]) font = fonts.get(tok[2]) ?? new Map()
      else if (tok[3]) line += decode(font, tok[3])
      else if (tok[6]) for (const h of tok[6].matchAll(/<([0-9a-fA-F]+)>/g)) line += decode(font, h[1]!)
      else if (tok[5]) { lines.push(line); line = '' }
    }
    text.push(lines.filter(Boolean).join('\n'))
  }
  return { pages, text, tags }
}

function decode(font: Map<string, string>, hex: string): string {
  const width = font.keys().next().value?.length ?? 2
  return (hex.match(new RegExp(`.{${width}}`, 'g')) ?? []).map((h) => font.get(h.toUpperCase()) ?? '').join('')
}
