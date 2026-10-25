#!/usr/bin/env node
// Puts every epic and task-group issue on the organisation project (GitHub Projects v2) and fills
// its roadmap fields from the repository: Release (single select, from the release milestone),
// Target (date, the milestone due date), Kind (Epic / Task group), Lane (A / B / C) and Status
// (Todo, or Done for closed issues). Idempotent. Runs in CI (.github/workflows/project-roadmap.yml)
// with a token that can write the project (secret PROJECT_TOKEN).
// Usage: PROJECT_TOKEN=... node scripts/github/project-roadmap.mjs [--org maoudia] [--project 7] [--repo maoudia/RetroBoard] [--dry-run]
const args = process.argv.slice(2)
const arg = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback)
const ORG = arg('org', 'maoudia')
const NUMBER = Number(arg('project', '7'))
const [OWNER, REPO] = arg('repo', 'maoudia/RetroBoard').split('/')
const DRY = args.includes('--dry-run')
const TOKEN = process.env.PROJECT_TOKEN || process.env.GITHUB_TOKEN


export const RELEASE_OPTIONS = ['R1 Beta ready', 'R2 Facilitation and visuals', 'R3 Teams and themes', 'R4 Agents and growth', 'Parked']
const COLORS = { 'R1 Beta ready': 'GREEN', 'R2 Facilitation and visuals': 'BLUE', 'R3 Teams and themes': 'PURPLE', 'R4 Agents and growth': 'ORANGE', Parked: 'GRAY' }

/** Roadmap fields of one issue, from its milestone, labels and state. */
export function fieldsOf(issue) {
  const labels = issue.labels.map((l) => (typeof l === 'string' ? l : l.name))
  return {
    release: RELEASE_OPTIONS.includes(issue.milestone?.title) ? issue.milestone.title : null,
    target: issue.milestone?.due_on ? issue.milestone.due_on.slice(0, 10) : null,
    kind: labels.includes('epic') ? 'Epic' : 'Task group',
    lane: labels.find((l) => /^lane:[ABC]$/.test(l))?.slice(5) ?? null,
    status: issue.state === 'closed' ? 'Done' : 'Todo',
  }
}

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}
async function rest(path) {
  const all = []
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } })
    const items = await res.json()
    if (!Array.isArray(items)) throw new Error(JSON.stringify(items))
    all.push(...items)
    if (items.length < 100) return all
  }
}

const FIELDS = `fields(first: 50) { nodes { ... on ProjectV2FieldCommon { id name dataType } ... on ProjectV2SingleSelectField { id name dataType options { id name } } } }`

async function project() {
  const d = await gql(`query($org: String!, $n: Int!) { organization(login: $org) { projectV2(number: $n) { id title ${FIELDS} } } }`, { org: ORG, n: NUMBER })
  return d.organization.projectV2
}

async function ensureSelect(p, name, options) {
  const f = p.fields.nodes.find((x) => x.name === name)
  if (f && options.every((o) => f.options?.some((x) => x.name === o))) return f
  const opts = options.map((o) => ({ name: o, color: COLORS[o] ?? 'GRAY', description: '' }))
  if (DRY) { console.log(`would ${f ? 'update' : 'create'} field ${name}`); return { id: 'dry', name, options: options.map((o) => ({ id: o, name: o })) } }
  if (f) return (await gql(`mutation($id: ID!, $o: [ProjectV2SingleSelectFieldOptionInput!]) { updateProjectV2Field(input: { fieldId: $id, singleSelectOptions: $o }) { projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } } } }`, { id: f.id, o: opts })).updateProjectV2Field.projectV2Field
  return (await gql(`mutation($p: ID!, $name: String!, $o: [ProjectV2SingleSelectFieldOptionInput!]) { createProjectV2Field(input: { projectId: $p, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $o }) { projectV2Field { ... on ProjectV2SingleSelectField { id name options { id name } } } } }`, { p: p.id, name, o: opts })).createProjectV2Field.projectV2Field
}

async function ensureDate(p, name) {
  const f = p.fields.nodes.find((x) => x.name === name)
  if (f) return f
  if (DRY) { console.log(`would create field ${name}`); return { id: 'dry', name } }
  return (await gql(`mutation($p: ID!, $name: String!) { createProjectV2Field(input: { projectId: $p, dataType: DATE, name: $name }) { projectV2Field { ... on ProjectV2FieldCommon { id name } } } }`, { p: p.id, name })).createProjectV2Field.projectV2Field
}

async function main() {
  if (!TOKEN) throw new Error('PROJECT_TOKEN is required (classic token with project and repo scopes, or a fine-grained token with Projects read/write on the organisation).')
  const p = await project()
  console.log(`Project: ${p.title}`)
  const release = await ensureSelect(p, 'Release', RELEASE_OPTIONS)
  const kind = await ensureSelect(p, 'Kind', ['Epic', 'Task group'])
  const lane = await ensureSelect(p, 'Lane', ['A', 'B', 'C'])
  const target = await ensureDate(p, 'Target')
  const status = p.fields.nodes.find((x) => x.name === 'Status')

  const issues = (await rest(`repos/${OWNER}/${REPO}/issues?state=all`))
    .filter((i) => !i.pull_request && i.labels.some((l) => l.name === 'epic' || l.name === 'task-group'))
  console.log(`${issues.length} epic and task-group issues`)
  const setSelect = (item, field, value) => {
    const opt = field.options?.find((o) => o.name === value)
    if (!opt || DRY) return null
    return gql('mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { singleSelectOptionId: $o } }) { projectV2Item { id } } }', { p: p.id, i: item, f: field.id, o: opt.id })
  }
  for (const issue of issues) {
    const f = fieldsOf(issue)
    // Closed issues of retired work stay off the board unless already on it.
    if (issue.state === 'closed' && !f.release) continue
    if (DRY) { console.log(`#${issue.number} ${issue.title} -> ${JSON.stringify(f)}`); continue }
    const item = (await gql('mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: { projectId: $p, contentId: $c }) { item { id } } }', { p: p.id, c: issue.node_id })).addProjectV2ItemById.item.id
    if (f.release) await setSelect(item, release, f.release)
    await setSelect(item, kind, f.kind)
    if (f.lane) await setSelect(item, lane, f.lane)
    if (status?.options) await setSelect(item, status, f.status)
    if (f.target) await gql('mutation($p: ID!, $i: ID!, $f: ID!, $d: Date!) { updateProjectV2ItemFieldValue(input: { projectId: $p, itemId: $i, fieldId: $f, value: { date: $d } }) { projectV2Item { id } } }', { p: p.id, i: item, f: target.id, d: f.target })
    console.log(`#${issue.number} ${issue.title}: ${f.release ?? '-'} / ${f.kind} / ${f.lane ?? '-'} / ${f.status}`)
  }
  console.log('Done. Views (Roadmap by Release, Board by Status) are set up once in the project UI: see docs/roadmap.md.')
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1) })
