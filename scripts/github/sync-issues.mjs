#!/usr/bin/env node
// Creates or updates GitHub milestones, labels, epic issues (one per OpenSpec change)
// and sub-issues (one per task group) from openspec/changes. Idempotent: matches by title.
// Usage: node scripts/github/sync-issues.mjs [--apply] [--repo owner/name]
// Without --apply it only prints what it would do. Requires the gh CLI (REST only).
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const REPO = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : 'maoudia/RetroBoard'
const ROOT = new URL('../../', import.meta.url).pathname
const CHANGES = join(ROOT, 'openspec/changes')

// Phase, lane and dependencies mirror docs/PLAN.md section 12.
const PLAN = {
  'restructure-ddd-monorepo': ['P0', 'A', []],
  'agentic-delivery-harness': ['P0', 'B', ['restructure-ddd-monorepo']],
  'edge-security-and-domain': ['P0', 'C', []],
  'e2e-encrypted-rooms': ['P1', 'A', ['restructure-ddd-monorepo']],
  'stateless-relay-and-replication': ['P1', 'A', ['e2e-encrypted-rooms']],
  'p2p-presence-and-cursors': ['P1', 'B', ['stateless-relay-and-replication']],
  'theme-policy-and-variants': ['P1', 'C', ['restructure-ddd-monorepo']],
  'responsive-and-i18n-hardening': ['P1', 'C', ['restructure-ddd-monorepo']],
  'facilitation-roles': ['P2', 'A', ['stateless-relay-and-replication']],
  'timeboxed-agenda': ['P2', 'A', ['facilitation-roles']],
  'talk-time': ['P2', 'A', ['timeboxed-agenda']],
  'voting-v2-and-ranking': ['P2', 'B', ['stateless-relay-and-replication']],
  'clusters-as-merged-ideas': ['P2', 'B', ['stateless-relay-and-replication']],
  'actions-v2-and-carry-over': ['P2', 'C', ['stateless-relay-and-replication']],
  'board-creation-v2': ['P2', 'A', ['timeboxed-agenda', 'voting-v2-and-ranking', 'actions-v2-and-carry-over']],
  'publishing-ux-redesign': ['P3', 'B', ['restructure-ddd-monorepo']],
  'postit-visual-system': ['P3', 'C', ['theme-policy-and-variants']],
  'profile-avatars-and-team-space': ['P3', 'B', ['restructure-ddd-monorepo']],
  'frictionless-sharing': ['P3', 'A', ['e2e-encrypted-rooms']],
  'webmcp-browser-agents': ['P3', 'C', ['restructure-ddd-monorepo']],
  'export-hub': ['P4', 'B', ['actions-v2-and-carry-over']],
  'retro-report': ['P4', 'C', ['voting-v2-and-ranking', 'talk-time']],
  'retro-mcp-and-agent-sessions': ['P5', 'A', ['stateless-relay-and-replication', 'facilitation-roles']],
  'local-ai-companion': ['P5', 'B', ['retro-report']],
  'landing-v2-and-product-video': ['P6', 'C', ['postit-visual-system']],
  'licensing-and-monetization': ['P6', 'A', ['stateless-relay-and-replication']],
  // Owner feedback wave of 2026-10-25.
  'sticky-notes-v2': ['P7', 'A', []],
  'single-facilitator': ['P7', 'A', []],
  'board-lifecycle': ['P7', 'A', []],
  'facilitator-moderation': ['P7', 'A', ['single-facilitator']],
  'cluster-reveal-motion': ['P7', 'B', []],
  'keyboard-shortcuts': ['P7', 'B', []],
  'voting-results-charts': ['P7', 'B', []],
  'activity-rings-timer': ['P7', 'B', []],
  'calendar-agenda-import': ['P7', 'C', []],
  'themes-pop-culture': ['P7', 'C', ['activity-rings-timer']],
  'ci-toolchain-speed': ['P7', 'C', []],
  'service-pages': ['P7', 'C', []],
}
const PHASES = {
  P0: 'P0 Foundations', P1: 'P1 Zero-storage core', P2: 'P2 Retro flow', P3: 'P3 UX',
  P4: 'P4 Outputs', P5: 'P5 Agents', P6: 'P6 Growth', P7: 'P7 Owner feedback 2026-10-25',
}
// Roadmap: every change belongs to one release milestone (the GitHub roadmap is built from these).
// Target dates are planning targets, revisited at each release review.
const RELEASES = {
  R1: { title: 'R1 Beta ready', due: '2026-11-08', description: 'Stable beta for real teams: service pages, one clear facilitator, sticky notes v2, board lifecycle, edge security, peer-to-peer field test, keyboard, faster CI.' },
  R2: { title: 'R2 Facilitation and visuals', due: '2026-11-29', description: 'Moderation, activity rings, cluster motion, results charts, publishing and note visuals, responsive and profile, exports and report.' },
  R3: { title: 'R3 Teams and themes', due: '2026-12-20', description: 'Calendar import, genre themes, creation stepper, action carry-over sources, delivery harness, WebMCP rollout.' },
  R4: { title: 'R4 Agents and growth', due: '2027-01-31', description: 'MCP server and agent sessions, local AI companion, landing v2 and product video.' },
  PARKED: { title: 'Parked', due: null, description: 'On hold by owner decision (monetisation postponed on 2026-10-24).' },
}
const ROADMAP = {
  'service-pages': 'R1', 'single-facilitator': 'R1', 'sticky-notes-v2': 'R1', 'board-lifecycle': 'R1', 'edge-security-and-domain': 'R1',
  'p2p-presence-and-cursors': 'R1', 'keyboard-shortcuts': 'R1', 'ci-toolchain-speed': 'R1',
  'facilitator-moderation': 'R2', 'activity-rings-timer': 'R2', 'cluster-reveal-motion': 'R2', 'voting-results-charts': 'R2', 'voting-v2-and-ranking': 'R2',
  'publishing-ux-redesign': 'R2', 'postit-visual-system': 'R2', 'responsive-and-i18n-hardening': 'R2', 'profile-avatars-and-team-space': 'R2',
  'export-hub': 'R2', 'retro-report': 'R2',
  'calendar-agenda-import': 'R3', 'themes-pop-culture': 'R3', 'board-creation-v2': 'R3', 'actions-v2-and-carry-over': 'R3',
  'agentic-delivery-harness': 'R3', 'webmcp-browser-agents': 'R3',
  'retro-mcp-and-agent-sessions': 'R4', 'local-ai-companion': 'R4', 'landing-v2-and-product-video': 'R4',
  'licensing-and-monetization': 'PARKED',
}
const LABELS = [
  ['epic', '5319e7', 'One OpenSpec change'], ['task-group', '1d76db', 'One task group of a change, one PR'],
  ['agent:ready', '0e8a16', 'Dependencies done, an agent can start'], ['agent:claude', 'd4a373', 'Run Claude Code on this issue'],
  ['agent:opencode', 'b7b7b7', 'Run OpenCode on this issue'], ['needs:human', 'b60205', 'Needs a human decision or review'],
  ['blocked', 'e99695', 'Waiting for dependencies'],
  ...Object.keys(PHASES).map((p) => [`phase:${p}`, 'c5def5', PHASES[p]]),
  ...['A', 'B', 'C'].map((l) => [`lane:${l}`, 'fef2c0', `Parallel lane ${l}`]),
]

const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const gh = (method, path, body) => {
  if (method !== 'GET') pause(1200) // stay under GitHub secondary rate limits for content creation
  const a = ['api', '-X', method, path, '-H', 'Accept: application/vnd.github+json']
  const out = execFileSync('gh', body ? [...a, '--input', '-'] : a, { input: body ? JSON.stringify(body) : undefined, encoding: 'utf8' })
  return out ? JSON.parse(out) : null
}
// Manual pagination: following Link headers may hit numeric-id URLs that some proxies refuse.
const ghAll = (path) => {
  const all = []
  for (let page = 1; ; page++) {
    const sep = path.includes('?') ? '&' : '?'
    const out = execFileSync('gh', ['api', `${path}${sep}page=${page}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const items = JSON.parse(out)
    all.push(...items)
    if (items.length < 100) return all
  }
}

function readChange(name) {
  const dir = join(CHANGES, name)
  const proposal = readFileSync(join(dir, 'proposal.md'), 'utf8')
  const tasks = readFileSync(join(dir, 'tasks.md'), 'utf8')
  const why = (proposal.split('## Why')[1] ?? '').split('##')[0].trim()
  const groups = []
  let cur = null
  for (const line of tasks.split('\n')) {
    const h = line.match(/^## (\d+)\. (.+)$/)
    if (h) { cur = { n: h[1], title: h[2].trim(), tasks: [] }; groups.push(cur); continue }
    if (line.startsWith('## ')) { cur = null; continue }
    const t = line.match(/^- \[ \] (.+)$/)
    if (t && cur) cur.tasks.push(t[1])
  }
  return { name, why, groups }
}

const changes = readdirSync(CHANGES).filter((n) => n !== 'archive' && existsSync(join(CHANGES, n, 'tasks.md')))
const missing = changes.filter((c) => !PLAN[c] || !ROADMAP[c])
if (missing.length) { console.error('Add phase/lane for:', missing.join(', ')); process.exit(1) }
const ordered = Object.keys(PLAN).filter((c) => changes.includes(c))

const link = (p) => `https://github.com/${REPO}/blob/main/${p}`
const epicBody = (c, deps) => [
  `**Release:** ${RELEASES[ROADMAP[c.name]].title}${RELEASES[ROADMAP[c.name]].due ? ` (target ${RELEASES[ROADMAP[c.name]].due})` : ''}`,
  `**OpenSpec change:** \`${c.name}\` ([proposal](${link(`openspec/changes/${c.name}/proposal.md`)}), [tasks](${link(`openspec/changes/${c.name}/tasks.md`)}), [specs](${link(`openspec/changes/${c.name}/specs`)}))`,
  `**Phase:** ${PHASES[PLAN[c.name][0]]} - **Lane:** ${PLAN[c.name][1]} - **Depends on:** ${deps.length ? deps.map((d) => `\`${d}\``).join(', ') : 'nothing'}`,
  '', '## Why', c.why, '', '## Task groups (one sub-issue and one PR each)',
  ...c.groups.map((g) => `- [ ] ${g.n}. ${g.title}`), '',
  'Plan: [docs/PLAN.md](' + link('docs/PLAN.md') + ') - Agent rules: [AGENTS.md](' + link('AGENTS.md') + ')',
].join('\n')
const groupBody = (c, g) => [
  `**Change:** \`${c.name}\` - **Task group:** ${g.n}. ${g.title}`, '',
  '## Tasks (verification included in each line)', ...g.tasks.map((t) => `- [ ] ${t}`), '',
  '## How to implement',
  `- Claude Code: \`/opsx:apply ${c.name}\` and work only on group ${g.n}`,
  `- OpenCode: \`/opsx-apply ${c.name}\` and work only on group ${g.n}`,
  `- PR body must contain \`Change: ${c.name}\`; tick the tasks in \`openspec/changes/${c.name}/tasks.md\`; run \`npm run verify\`.`,
].join('\n')

const plan = []
for (const name of ordered) {
  const c = readChange(name)
  const [phase, lane, deps] = PLAN[name]
  // A dependency is done once its change is archived (no longer in openspec/changes).
  const ready = deps.every((d) => !changes.includes(d)) && ROADMAP[name] !== 'PARKED'
  plan.push({ kind: 'epic', c, title: `[epic] ${name}`, body: epicBody(c, deps), labels: ['epic', `phase:${phase}`, `lane:${lane}`, ready ? 'agent:ready' : 'blocked'], phase })
  for (const g of c.groups.filter((x) => x.tasks.length)) plan.push({ kind: 'group', c, g, title: `[${name}] ${g.n}. ${g.title}`, body: groupBody(c, g), labels: ['task-group', `phase:${phase}`, `lane:${lane}`, ready && g.n === '1' ? 'agent:ready' : 'blocked'], phase, parent: `[epic] ${name}` })
}

console.log(`${APPLY ? 'Applying' : 'Dry run'} on ${REPO}: ${Object.keys(RELEASES).length} release milestones, ${LABELS.length} labels, ${plan.filter((p) => p.kind === 'epic').length} epics, ${plan.filter((p) => p.kind === 'group').length} task-group issues`)
if (!APPLY) { for (const p of plan) console.log(`${p.kind === 'epic' ? '' : '   '}${p.title}  [${p.labels.join(', ')}]`); process.exit(0) }

const existingLabels = new Set(ghAll(`repos/${REPO}/labels?per_page=100`).map((l) => l.name))
for (const [name, color, description] of LABELS) if (!existingLabels.has(name)) gh('POST', `repos/${REPO}/labels`, { name, color, description })
const milestones = Object.fromEntries(ghAll(`repos/${REPO}/milestones?state=all&per_page=100`).map((m) => [m.title, m.number]))
for (const r of Object.values(RELEASES)) {
  const body = { title: r.title, description: r.description, state: 'open', ...(r.due ? { due_on: `${r.due}T23:59:59Z` } : {}) }
  milestones[r.title] = milestones[r.title] ? gh('PATCH', `repos/${REPO}/milestones/${milestones[r.title]}`, body).number : gh('POST', `repos/${REPO}/milestones`, body).number
}
const issues = Object.fromEntries(ghAll(`repos/${REPO}/issues?state=all&per_page=100`).filter((i) => !i.pull_request).map((i) => [i.title, i]))
for (const p of plan) {
  const payload = { title: p.title, body: p.body, labels: p.labels, milestone: milestones[RELEASES[ROADMAP[p.c.name]].title] }
  const found = issues[p.title]
  issues[p.title] = found ? gh('PATCH', `repos/${REPO}/issues/${found.number}`, { body: p.body, milestone: payload.milestone, labels: [...new Set([...found.labels.map((l) => l.name).filter((l) => !/^(agent:ready|blocked)$/.test(l)), ...p.labels])] }) : gh('POST', `repos/${REPO}/issues`, payload)
  console.log(`${found ? 'updated' : 'created'} #${issues[p.title].number} ${p.title}`)
}
for (const p of plan.filter((x) => x.kind === 'group')) {
  const parent = issues[p.parent]
  try { gh('POST', `repos/${REPO}/issues/${parent.number}/sub_issues`, { sub_issue_id: issues[p.title].id }) } catch { /* already linked */ }
}
console.log('Done. Create the project board in the GitHub UI and enable its "Auto-add to project" workflow for this repository.')
