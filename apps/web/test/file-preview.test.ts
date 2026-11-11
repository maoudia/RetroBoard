import { describe, expect, it } from 'vitest'
import { fileSize, formatSize, frameDocument, markdownToHtml, parseDelimited, parseJsonLines, previewKind } from '../app/utils/file-preview'

const file = (name: string, opaque = false) => ({ name, mime: 'text/plain', content: '', opaque })

describe('previewKind', () => {
  it('picks the rendering from the file extension', () => {
    expect(['a.html', 'a.md', 'a.csv', 'a.tsv', 'a.json', 'a.jsonl', 'a.txt'].map((n) => previewKind(file(n)))).toEqual(['html', 'markdown', 'table', 'table', 'json', 'jsonl', 'text'])
    expect(previewKind(file('a.retro', true))).toBe('opaque')
    expect(previewKind(file('A.CSV'))).toBe('table')
  })
})

describe('size', () => {
  it('counts the bytes of the file, not its characters', () => {
    expect(fileSize('abc')).toBe(3)
    expect(fileSize('é')).toBe(2)
  })
  it('formats with decimal units', () => {
    expect([0, 999, 1000, 3456, 999_999, 1_200_000].map(formatSize)).toEqual(['0 B', '999 B', '1.0 kB', '3.5 kB', '1000.0 kB', '1.2 MB'])
  })
})

describe('parseDelimited', () => {
  it('reads quoted CSV cells with commas, quotes and line breaks', () => {
    expect(parseDelimited('"a","b, c"\n"say ""hi""","l1\nl2"\n', ',')).toEqual([['a', 'b, c'], ['say "hi"', 'l1\nl2']])
  })
  it('reads CRLF files and a last line without a line break', () => {
    expect(parseDelimited('a,b\r\nc,d', ',')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('reads TSV, where a quote is just a character', () => {
    expect(parseDelimited('x\t"y\tz\n', '\t')).toEqual([['x', '"y', 'z']])
  })
  it('keeps empty cells and returns no row for an empty file', () => {
    expect(parseDelimited('a,,c\n', ',')).toEqual([['a', '', 'c']])
    expect(parseDelimited('', ',')).toEqual([])
  })
})

describe('parseJsonLines', () => {
  it('parses each line and keeps a broken line as text', () => {
    expect(parseJsonLines('{"a":1}\n\nnope\n[2]\n')).toEqual([{ a: 1 }, 'nope', [2]])
  })
})

describe('markdownToHtml', () => {
  it('renders headings, nested lists, task items, bold and emphasis', () => {
    const html = markdownToHtml('# Title\n\n_2026-11-11_\n\n- **Group** (2 votes)\n  - child\n- [x] done (Ana)\n- [ ] todo\n')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<p><em>2026-11-11</em></p>')
    expect(html).toContain('<li><strong>Group</strong> (2 votes)</li>')
    expect(html).toMatch(/<ul>\n<li><strong>Group<\/strong>[^]*<ul>\n<li>child<\/li>\n<\/ul>/)
    expect(html).toContain('&#9745;')
    expect(html).toContain('&#9744;')
    expect((html.match(/<ul>/g) ?? []).length).toBe((html.match(/<\/ul>/g) ?? []).length)
  })
  it('shows front matter and code fences as they are', () => {
    const html = markdownToHtml('---\nformat: x\ntitle: "a"\n---\n\n# T\n\n```json\n{"k": "<b>"}\n```\n')
    expect(html).toContain('<pre>format: x\ntitle: &quot;a&quot;</pre>')
    expect(html).toContain('<pre>{&quot;k&quot;: &quot;&lt;b&gt;&quot;}</pre>')
  })
  it('escapes everything a participant wrote', () => {
    const html = markdownToHtml('- <img src=x onerror=alert(1)> and <script>x</script>\n')
    expect(html).not.toMatch(/<img|<script/)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})

describe('frameDocument', () => {
  it('shows an HTML file as it is', () => {
    expect(frameDocument('html', '<h1>x</h1>')).toBe('<h1>x</h1>')
  })
  it('wraps Markdown in a document with the report stylesheet', () => {
    const doc = frameDocument('markdown', '# T')
    expect(doc).toMatch(/^<!doctype html>.*<style>.+<\/style>.*<h1>T<\/h1>/s)
    expect(doc).not.toMatch(/<script/)
  })
})
