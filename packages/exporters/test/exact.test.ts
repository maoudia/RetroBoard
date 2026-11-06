import { buildSnapshot, type Snapshot } from '@retroboard/domain'
import { alice, bob, harness } from '@retroboard/testkit'
import { describe, expect, it } from 'vitest'
import { csvCell, RAG_FORMAT, toActionsCsv, toCsv, toJson, toMarkdown, toRagJsonl, toRagMarkdown, tsvCell } from '../src'

const day = new Date('2026-11-02T23:59:00Z')

/** A snapshot with exactly the fields the RAG export reads. */
const ragSnapshot = (over: Record<string, unknown> = {}): Snapshot => ({
  settings: { title: ' Sprint \n 42 ' },
  columns: [{ id: 'c1', title: 'Start  here' }, { id: 'c2', title: 'Stop' }],
  agenda: null,
  groups: [
    { id: 'g1', columnId: 'c1', title: null, votes: 3 },
    { id: 'g2', columnId: 'c2', title: 'Titled\ngroup', votes: null },
    { id: 'g3', columnId: 'nowhere', title: null, votes: 0 },
  ],
  notes: [
    { id: 'n1', columnId: 'c1', groupId: 'g1', votes: 2, author: 'Ana', text: '  first\tidea  ' },
    { id: 'n2', columnId: 'c1', groupId: 'g1', votes: null, author: null, text: 'second' },
    { id: 'n3', columnId: 'c2', groupId: null, votes: 0, author: null, text: 'solo\n\nidea' },
    { id: 'n4', columnId: 'gone', groupId: 'missing', votes: 1, author: 'Bo', text: 'orphan' },
  ],
  actions: [{ id: 'a1', text: ' do  it ', sourceNote: 'g1' }, { id: 'a2', text: 'x', sourceNote: 'n3' }, { id: 'a3', text: 'y' }],
  ...over,
}) as unknown as Snapshot

/** A chunk with its keys in the order of the published schema. */
const chunk = (phase: string | null, c: { id: string; kind: string; column: string | null; cluster: { id: string; title: string | null } | null; votes: number | null; authorKind: string | null; text: string; links: string[] }) =>
  JSON.stringify({ format: RAG_FORMAT, retro: { title: 'Sprint 42', date: '2026-11-02' }, phase, untrusted: true, ...c })

describe('RAG export, exactly', () => {
  const lines = (phase: string | null) => [
    chunk(phase, { id: 'cluster:g1', kind: 'cluster', column: 'Start here', cluster: { id: 'g1', title: null }, votes: 3, authorKind: null, text: 'first idea', links: ['idea:n1', 'idea:n2'] }),
    chunk(phase, { id: 'cluster:g2', kind: 'cluster', column: 'Stop', cluster: { id: 'g2', title: 'Titled\ngroup' }, votes: null, authorKind: null, text: 'Titled group', links: [] }),
    chunk(phase, { id: 'cluster:g3', kind: 'cluster', column: null, cluster: { id: 'g3', title: null }, votes: 0, authorKind: null, text: '', links: [] }),
    chunk(phase, { id: 'idea:n1', kind: 'idea', column: 'Start here', cluster: { id: 'g1', title: null }, votes: 2, authorKind: 'named', text: 'first idea', links: ['cluster:g1'] }),
    chunk(phase, { id: 'idea:n2', kind: 'idea', column: 'Start here', cluster: { id: 'g1', title: null }, votes: null, authorKind: 'anonymous', text: 'second', links: ['cluster:g1'] }),
    chunk(phase, { id: 'idea:n3', kind: 'idea', column: 'Stop', cluster: null, votes: 0, authorKind: 'anonymous', text: 'solo idea', links: [] }),
    chunk(phase, { id: 'idea:n4', kind: 'idea', column: null, cluster: null, votes: 1, authorKind: 'named', text: 'orphan', links: [] }),
    chunk(phase, { id: 'action:a1', kind: 'action', column: null, cluster: null, votes: null, authorKind: null, text: 'do it', links: ['cluster:g1'] }),
    chunk(phase, { id: 'action:a2', kind: 'action', column: null, cluster: null, votes: null, authorKind: null, text: 'x', links: ['idea:n3'] }),
    chunk(phase, { id: 'action:a3', kind: 'action', column: null, cluster: null, votes: null, authorKind: null, text: 'y', links: [] }),
  ]

  it('writes one line per cluster, idea and action, in that order, with every field', () => {
    expect(toRagJsonl(ragSnapshot(), day)).toBe(lines(null).join('\n') + '\n')
  })

  it('says which phase of the agenda was running, and none when the agenda is not on a phase', () => {
    const agenda = (current: number) => ({ agenda: { current, phases: [{ kind: 'write' }, { kind: 'group' }] } })
    expect(toRagJsonl(ragSnapshot(agenda(1)), day)).toBe(lines('group').join('\n') + '\n')
    expect(toRagJsonl(ragSnapshot(agenda(0)), day)).toBe(lines('write').join('\n') + '\n')
    for (const current of [-1, 2]) expect(toRagJsonl(ragSnapshot(agenda(current)), day)).toBe(lines(null).join('\n') + '\n')
  })

  it('writes nothing but the final newline for a board with nothing in it', () => {
    expect(toRagJsonl(ragSnapshot({ groups: [], notes: [], actions: [] }), day)).toBe('\n')
  })

  it('Markdown: a front matter and a list per column, then the actions, exactly', () => {
    const front = (section: string, title: string) => `---\nformat: retroboard-rag-v1\nretro: "Sprint 42"\ndate: 2026-11-02\nsection: "${section}"\ntitle: "${title}"\nuntrusted: true\n---\n`
    expect(toRagMarkdown(ragSnapshot(), day)).toBe([
      `${front('column', 'Start here')}\n# Start here\n\n- [cluster:g1] (3) first idea\n- [idea:n1] (2) first idea\n- [idea:n2] second\n`,
      `${front('column', 'Stop')}\n# Stop\n\n- [cluster:g2] Titled group\n- [idea:n3] (0) solo idea\n`,
      `${front('actions', 'Actions')}\n# Actions\n\n- [action:a1] do it\n- [action:a2] x\n- [action:a3] y\n`,
    ].join('\n'))
  })

  it('Markdown: a dash where a column or the actions have nothing, and the title and date of the board when there is no chunk', () => {
    const md = toRagMarkdown(ragSnapshot({ groups: [], notes: [], actions: [], settings: { title: 'Plain' } }), day)
    expect(md).toContain('retro: "Plain"\ndate: 2026-11-02\nsection: "column"\ntitle: "Start here"')
    expect(md.match(/\n-\n/g)).toHaveLength(3)
    expect(md).toContain('# Start here\n\n-\n')
    expect(md).toContain('# Actions\n\n-\n')
    expect(md.split('\n---\nformat:')).toHaveLength(3)
  })
})

describe('spreadsheet cells', () => {
  it('collapse any run of tabs and line breaks into one space, and keep other spaces', () => {
    expect(tsvCell('a\t\tb')).toBe('a b')
    expect(tsvCell('a\r\nb')).toBe('a b')
    expect(tsvCell('a\n\n\nb\tc')).toBe('a b c')
    expect(tsvCell('a  b')).toBe('a  b')
    expect(tsvCell(42)).toBe('42')
  })

  it('neutralise a formula whatever it starts with, and only then', () => {
    for (const bad of ['=1+1', '+1', '-1', '@sum']) expect(tsvCell(bad)).toBe(`'${bad}`)
    expect(tsvCell('a=1')).toBe('a=1')
    expect(tsvCell('\t=1')).toBe(' =1')
  })

  it('quote a CSV cell, double its quotes and neutralise formulas (also after a tab or a return)', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    for (const bad of ['=1', '+1', '-1', '@x', '\tx', '\rx']) expect(csvCell(bad)).toBe(`"'${bad}"`)
    expect(csvCell('ok')).toBe('"ok"')
    expect(csvCell(7)).toBe('"7"')
  })
})

describe('Markdown, CSV and JSON exports, exactly', () => {
  function board() {
    const h = harness()
    h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'Sprint 42' })
    const add = (text: string, actor = alice) => { h.run({ t: 'note.add', columnId: h.col(0), text }, actor); return Object.values(h.state.notes).find((n) => n.text === text.trim())!.id }
    add('  Named idea \n second line ')
    add('Anonymous idea', bob)
    const one = add('Grouped one')
    const two = add('Grouped two', bob)
    h.run({ t: 'note.group', id: one, ontoId: two }, alice)
    h.run({ t: 'group.rename', id: h.state.notes[one]!.groupId!, title: 'A  theme' })
    h.run({ t: 'action.add', text: 'Open  action', owner: 'Ana' })
    h.run({ t: 'action.add', text: 'Done action', owner: '' })
    h.run({ t: 'action.status', id: Object.values(h.state.actions).find((a) => a.text === 'Done action')!.id, status: 'done' })
    return buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
  }
  const labels = ((k: string, p?: { n: number }) => (p ? `${k}:${p.n}` : k)) as never

  it('Markdown lists named and anonymous notes, clusters with their notes, empty columns and the actions with their owner and state', () => {
    expect(toMarkdown(board(), { date: day, labels })).toBe([
      '# Sprint 42', '', '_2026-11-02_', '',
      '## Start', '',
      '- Named idea second line (export.votes:0) - Alice', '- Anonymous idea (export.votes:0)',
      '- **A  theme** (export.votes:0)', '  - Grouped one - Alice', '  - Grouped two', '',
      '## Stop', '', 'export.noNote', '',
      '## Continue', '', 'export.noNote', '',
      '## export.actions', '',
      '- [ ] Open  action (Ana)', '- [x] Done action', '',
    ].join('\n'))
  })

  it('Markdown says there is no action, and hides the votes while they are secret', () => {
    const h = harness()
    h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
    const snap = buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
    expect(toMarkdown(snap, { date: day, labels })).toContain('## export.actions\n\nexport.noAction\n')
    const secret = { ...snap, settings: { ...snap.settings, secretVoting: true, votingClosed: false }, notes: [{ ...Object.values(board().notes)[0]!, votes: null }] } as Snapshot
    expect(toMarkdown(secret, { date: day, labels })).not.toContain('export.votes')
  })

  it('CSV has a header and one row per note with its column, cluster title, votes and author, every cell quoted', () => {
    expect(toCsv(board(), labels)).toBe([
      '"export.csv.column","export.csv.group","export.csv.note","export.csv.votes","export.csv.author"',
      '"Start","","Named idea \n second line","0","Alice"',
      '"Start","","Anonymous idea","0",""',
      '"Start","A  theme","Grouped one","0","Alice"',
      '"Start","A  theme","Grouped two","0",""',
      '',
    ].join('\n'))
  })

  it('CSV leaves the column empty for a note whose column is gone, and the votes and author empty when there are none', () => {
    const snap = board()
    const odd = { ...snap, notes: [{ ...snap.notes[0]!, columnId: 'gone', votes: null, author: null }] } as Snapshot
    expect(toCsv(odd, labels).split('\n').slice(1).join('\n')).toBe('"","","Named idea \n second line","",""\n')
  })

  it('JSON is the board without what is personal to the viewer', () => {
    const json = JSON.parse(toJson(board())) as { notes: Record<string, unknown>[]; groups: unknown[]; actions: unknown[]; columns: unknown[]; settings: { title: string } }
    expect(json.settings.title).toBe('Sprint 42')
    expect(json.notes).toHaveLength(4)
    for (const n of json.notes) { expect(n).not.toHaveProperty('mine'); expect(n).not.toHaveProperty('voted') }
    expect(json.groups).toHaveLength(1)
    expect(json.actions).toHaveLength(2)
    expect(json.columns).toHaveLength(3)
    expect(toJson(board())).toContain('\n  "settings"')
  })
})

describe('smaller details, exactly', () => {
  const labels = ((k: string, p?: { n: number }) => (p ? `${k}:${p.n}` : k)) as never

  const tiny = (group = false) => {
    const h = harness()
    h.run({ t: 'board.init', templateId: 'start-stop-continue', themeId: 'studio', title: 'T' })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' }, alice)
    h.run({ t: 'note.add', columnId: h.col(0), text: 'b' }, alice)
    if (group) { const [a, b] = Object.keys(h.state.notes); h.run({ t: 'note.group', id: a!, ontoId: b! }) }
    return buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
  }

  it('Markdown puts the text of a note on one line without the space around it', () => {
    const padded = { ...tiny(), notes: tiny().notes.map((n) => ({ ...n, text: '  padded \n out  ' })) } as Snapshot
    expect(toMarkdown(padded, { date: day, labels })).toContain('\n- padded out (export.votes:0) - Alice\n')
  })

  it('CSV leaves the group empty for a cluster that has no title', () => {
    const rows = toCsv(tiny(true), labels).split('\n')
    expect(rows[1]).toBe('"Start","","a","0","Alice"')
    expect(rows[2]).toBe('"Start","","b","0","Alice"')
  })

  it('Jira labels join the words of the title with one dash, and the description says where an action came from', () => {
    const snap = { settings: { title: 'Sprint  42 review' }, actions: [{ text: 'a', owner: 'Ana', status: 'doing', due: '2026-11-03', carriedFrom: 'Sprint 41' }, { text: 'b', owner: '', status: 'dropped', due: null, carriedFrom: null }] }
    expect(toActionsCsv(snap as never)).toBe([
      '"Summary","Assignee","Status","Due Date","Description","Labels"',
      '"a","Ana","In Progress","2026-11-03","Retro: Sprint  42 review (carried over from Sprint 41)","retro:Sprint-42-review"',
      '"b","","Won\'t Do","","Retro: Sprint  42 review","retro:Sprint-42-review"',
      '',
    ].join('\n'))
  })
})
