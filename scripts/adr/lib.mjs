// Architecture Decision Records in MADR 4.0 format (https://adr.github.io/madr/), lean variant:
// front matter (status, date, decision-makers) + Context, Considered Options, Decision Outcome.
// Pure functions, unit tested in scripts/adr/adr.test.mjs; used by check.mjs, index.mjs and new.mjs.

export const FILE_RE = /^(\d{4})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/
export const STATUSES = ['proposed', 'accepted', 'rejected', 'deprecated']
export const SUPERSEDED_RE = /^superseded by ADR-(\d{4})$/
export const REQUIRED_SECTIONS = ['Context and Problem Statement', 'Considered Options', 'Decision Outcome']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Splits `---` front matter (flat `key: value` lines, optional quotes) from the body. */
export function parseFrontMatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text)
  if (!m) return { meta: null, body: text }
  const meta = {}
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const kv = /^([a-z-]+):\s*(.*)$/.exec(line)
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
  }
  return { meta, body: text.slice(m[0].length) }
}

/** Parses one ADR file into a record; `errors` lists everything wrong with it. */
export function parseAdr(file, text, today = new Date().toISOString().slice(0, 10)) {
  const errors = []
  const fm = FILE_RE.exec(file)
  if (!fm) errors.push('file name must be NNNN-kebab-case-title.md')
  const { meta, body } = parseFrontMatter(text)
  const status = meta?.status ?? ''
  const date = meta?.date ?? ''
  if (!meta) errors.push('missing front matter (status, date, decision-makers)')
  else {
    if (!STATUSES.includes(status) && !SUPERSEDED_RE.test(status)) errors.push(`status "${status}" must be one of ${STATUSES.join(', ')} or "superseded by ADR-NNNN"`)
    if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) errors.push(`date "${date}" must be YYYY-MM-DD`)
    else if (date > today) errors.push(`date ${date} is in the future`)
    if (!meta['decision-makers']) errors.push('decision-makers is required')
  }
  const title = /^# (.+)$/m.exec(body)?.[1]?.trim() ?? ''
  if (!title) errors.push('missing "# Title"')
  const sections = new Map()
  let current = null
  for (const line of body.split('\n')) {
    const h = /^## (.+)$/.exec(line)
    if (h) { current = h[1].trim(); sections.set(current, []); continue }
    if (current) sections.get(current).push(line)
  }
  for (const s of REQUIRED_SECTIONS) if (!sections.has(s)) errors.push(`missing section "## ${s}"`)
  const options = (sections.get('Considered Options') ?? []).filter((l) => /^[*-] /.test(l)).map((l) => l.slice(2).trim())
  if (sections.has('Considered Options') && options.length < 2) errors.push('list at least two considered options')
  const outcome = (sections.get('Decision Outcome') ?? []).join('\n')
  const chosen = /Chosen option: "([^"]+)"/.exec(outcome)?.[1]
  if (sections.has('Decision Outcome') && !chosen) errors.push('Decision Outcome must start with: Chosen option: "<option>", because ...')
  else if (chosen && !options.some((o) => o.replace(/\*\*/g, '').startsWith(chosen))) errors.push(`chosen option "${chosen}" is not in Considered Options`)
  if (/\{[^}\n]{3,}\}/.test(body.replace(/`[^`]*`/g, ''))) errors.push('template placeholder "{...}" left in the text')
  const superseded = SUPERSEDED_RE.exec(status)?.[1] ?? null
  return { file, number: fm ? Number(fm[1]) : -1, slug: fm?.[2] ?? '', title, status, date, chosen: chosen ?? '', superseded, errors }
}

/** Checks the set: unique and contiguous numbers from 0, supersession targets exist and are accepted. */
export function checkSet(adrs) {
  const errors = []
  const byNumber = new Map()
  for (const a of adrs) {
    if (a.number < 0) continue
    if (byNumber.has(a.number)) errors.push(`${a.file}: number ${a.number} already used by ${byNumber.get(a.number).file}`)
    else byNumber.set(a.number, a)
  }
  const max = Math.max(-1, ...byNumber.keys())
  for (let n = 0; n <= max; n++) if (!byNumber.has(n)) errors.push(`ADR-${String(n).padStart(4, '0')} is missing (numbers must not have gaps)`)
  for (const a of adrs) {
    if (a.superseded === null) continue
    const target = byNumber.get(Number(a.superseded))
    if (!target) errors.push(`${a.file}: superseded by ADR-${a.superseded}, which does not exist`)
    else if (target.number === a.number) errors.push(`${a.file}: cannot supersede itself`)
    else if (target.status !== 'accepted' && target.status !== 'proposed') errors.push(`${a.file}: superseded by ADR-${a.superseded}, which is ${target.status}`)
  }
  return errors
}

/** README index of all ADRs (generated; `pnpm adr:index` writes it, the check compares). */
export function renderIndex(adrs) {
  const sorted = [...adrs].sort((x, y) => x.number - y.number)
  const fileOf = new Map(sorted.map((a) => [a.number, a.file]))
  const status = (a) => (a.superseded ? `superseded by [ADR-${a.superseded}](${fileOf.get(Number(a.superseded)) ?? ''})` : a.status)
  return [
    '# Architecture Decision Records',
    '',
    'Decisions that shape RetroBoard, one file each, in the [MADR 4.0](https://adr.github.io/madr/) format.',
    'Write one with `pnpm adr:new "Short title"`; `pnpm adr:check` (also in CI) validates them and this index.',
    '',
    'Rules: an ADR is never rewritten once accepted. To change a decision, write a new ADR and mark the',
    'old one `superseded by ADR-NNNN`. Small clarifications go in its "More Information" section.',
    '',
    '<!-- Generated by scripts/adr/index.mjs. Do not edit the table by hand. -->',
    '',
    '| ADR | Title | Status | Date |',
    '|---|---|---|---|',
    ...sorted.map((a) => `| [${String(a.number).padStart(4, '0')}](${a.file}) | ${a.title.replace(/\|/g, '\\|')} | ${status(a)} | ${a.date} |`),
    '',
  ].join('\n')
}

/** File name for a new ADR. */
export function newFileName(number, title) {
  const slug = title.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  return `${String(number).padStart(4, '0')}-${slug || 'decision'}.md`
}
