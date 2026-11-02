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
  // Dependencies relaxed on 2026-10-29: the voting and action settings it needs have shipped; only sealed ballot and carry-over sources remain.
  'board-creation-v2': ['P2', 'A', []],
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
  'single-facilitator': ['P7', 'A', ['open-facilitation-default']],
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
  // Second owner wave of 2026-10-25.
  'open-facilitation-default': ['P7', 'A', []],
  'phase-availability-cues': ['P7', 'B', []],
  'name-nudge': ['P7', 'B', []],
  'phase-end-notifications': ['P7', 'B', []],
  'note-to-action': ['P7', 'C', []],
  'actions-from-votes': ['P7', 'C', ['note-to-action']],
  'accessibility-wcag': ['P7', 'C', []],
  // Field test of 2026-10-25 (real devices, peer to peer): beta blockers.
  'reliable-board-sync': ['P7', 'A', []],
  'author-name-by-default': ['P7', 'B', []],
  'draft-first-composer': ['P7', 'B', []],
  // Owner feedback wave of 2026-10-29: design value first, then quality.
  'composer-and-colour-v3': ['P8', 'B', []],
  'facilitator-controls-v2': ['P8', 'A', []],
  'board-activity-feed': ['P8', 'B', []],
  'design-system-components': ['P8', 'C', []],
  'short-links-and-join': ['P8', 'A', []],
  'presenter-mode-v2': ['P8', 'C', []],
  'column-voting-scope': ['P8', 'B', []],
  'recent-boards-visible': ['P9', 'B', []],
  'board-recovery': ['P9', 'B', []],
  'options-simple-mode': ['P9', 'B', []],
  'join-by-link': ['P9', 'B', []],
  'profile-simple-mode': ['P9', 'B', []],
  'smart-title': ['P9', 'B', []],
  'creation-voting': ['P9', 'B', []],
  'creation-polish': ['P9', 'B', []],
  'simple-advanced-mode': ['P9', 'B', []],
  'identity-conflicts': ['P8', 'B', []],
  'column-tools': ['P8', 'B', []],
  'note-freeze': ['P8', 'C', []],
  'talk-time-v2': ['P8', 'A', []],
  'keyboard-shortcuts-v2': ['P8', 'B', []],
  'agents-first-class': ['P8', 'C', []],
  'quality-gates-v2': ['P8', 'C', []],
  'automated-semver-release': ['P8', 'C', []],
  'clusters-v2': ['P8', 'A', []],
  'board-type-migration': ['P8', 'B', []],
  'allure-report-aggregation': ['P8', 'C', []],
  'self-rename-event': ['P8', 'A', []],
  // Owner feedback wave of 2026-11-01.
  'column-visibility': ['P9', 'B', []],
  'time-display-options': ['P9', 'B', []],
  'note-pin': ['P9', 'C', []],
  'up-down-votes': ['P9', 'B', []],
  'presence-status': ['P9', 'A', []],
  'button-icons-everywhere': ['P9', 'B', []],
  'toolbar-mobile-scroll': ['P9', 'B', []],
  'agenda-clock-v2': ['P9', 'B', []],
}
const PHASES = {
  P0: 'P0 Foundations', P1: 'P1 Zero-storage core', P2: 'P2 Retro flow', P3: 'P3 UX',
  P4: 'P4 Outputs', P5: 'P5 Agents', P6: 'P6 Growth', P7: 'P7 Owner feedback 2026-10-25', P8: 'P8 Owner feedback 2026-10-29', P9: 'P9 Owner feedback 2026-11-01',
}
// Roadmap: every change belongs to one release milestone (the GitHub roadmap is built from these).
// Target dates are planning targets, revisited at each release review.
const RELEASES = {
  R1: { title: 'R1 Beta ready', due: '2026-11-08', description: 'Stable beta for real teams: service pages, everyone facilitates by default (or one clear facilitator), phase cues, name nudge, sticky notes v2, board lifecycle, edge security, peer-to-peer field test, keyboard, faster CI.' },
  R2: { title: 'R2 Facilitation and visuals', due: '2026-11-29', description: 'Accessibility (WCAG 2.2 AA), phase-end popups, note to action and voted ideas, moderation, activity rings, cluster motion, results charts, publishing and note visuals, responsive and profile, exports and report.' },
  R3: { title: 'R3 Teams and themes', due: '2026-12-20', description: 'Calendar import, genre themes, creation stepper, action carry-over sources, delivery harness, WebMCP rollout.' },
  R4: { title: 'R4 Agents and growth', due: '2027-01-31', description: 'MCP server and agent sessions, local AI companion, landing v2 and product video.' },
  PARKED: { title: 'Parked', due: null, description: 'On hold by owner decision (monetisation postponed on 2026-10-24).' },
}
const ROADMAP = {
  'service-pages': 'R1', 'single-facilitator': 'R1', 'sticky-notes-v2': 'R1', 'board-lifecycle': 'R1', 'edge-security-and-domain': 'R1',
  'p2p-presence-and-cursors': 'R1', 'keyboard-shortcuts': 'R1', 'ci-toolchain-speed': 'R1',
  'open-facilitation-default': 'R1', 'phase-availability-cues': 'R1', 'name-nudge': 'R1',
  'reliable-board-sync': 'R1', 'author-name-by-default': 'R1', 'draft-first-composer': 'R1',
  'accessibility-wcag': 'R2', 'phase-end-notifications': 'R2', 'note-to-action': 'R2', 'actions-from-votes': 'R2',
  'facilitator-moderation': 'R2', 'activity-rings-timer': 'R2', 'cluster-reveal-motion': 'R2', 'voting-results-charts': 'R2', 'voting-v2-and-ranking': 'R2',
  'publishing-ux-redesign': 'R2', 'postit-visual-system': 'R2', 'responsive-and-i18n-hardening': 'R2', 'profile-avatars-and-team-space': 'R2',
  'export-hub': 'R2', 'retro-report': 'R2',
  'composer-and-colour-v3': 'R2', 'facilitator-controls-v2': 'R2', 'board-activity-feed': 'R2', 'design-system-components': 'R2',
  'short-links-and-join': 'R2', 'presenter-mode-v2': 'R2', 'column-voting-scope': 'R2', 'recent-boards-visible': 'R2', 'board-recovery': 'R2', 'options-simple-mode': 'R2', 'join-by-link': 'R2', 'profile-simple-mode': 'R2', 'smart-title': 'R2', 'creation-voting': 'R2', 'creation-polish': 'R2', 'simple-advanced-mode': 'R2', 'identity-conflicts': 'R2', 'quality-gates-v2': 'R2', 'automated-semver-release': 'R1', 'clusters-v2': 'R2', 'board-type-migration': 'R2', 'allure-report-aggregation': 'R2', 'self-rename-event': 'R1',
  // Onboarding is the first thing users see (owner, 2026-10-29): smart default creation moves to R2.
  'board-creation-v2': 'R2',
  'column-tools': 'R3', 'note-freeze': 'R3', 'talk-time-v2': 'R3', 'keyboard-shortcuts-v2': 'R3', 'agents-first-class': 'R3',
  'calendar-agenda-import': 'R3', 'themes-pop-culture': 'R3', 'actions-v2-and-carry-over': 'R3',
  'agentic-delivery-harness': 'R3', 'webmcp-browser-agents': 'R3',
  'retro-mcp-and-agent-sessions': 'R4', 'local-ai-companion': 'R4', 'landing-v2-and-product-video': 'R4',
  'column-visibility': 'R2', 'time-display-options': 'R2', 'presence-status': 'R2', 'note-pin': 'R3', 'up-down-votes': 'R3', 'button-icons-everywhere': 'R2', 'toolbar-mobile-scroll': 'R2', 'agenda-clock-v2': 'R2',
  'licensing-and-monetization': 'PARKED',
}
// Priority (owner rule, 2026-10-29): bugs first, then what users see (design), then CI/CD quality, then the rest.
// Bugs are standalone `bug` issues labelled priority:1-urgent; every change gets one of the other levels.
const PRIORITY_LEVELS = [
  ['priority:1-urgent', 'b60205', 'Bugs and anything blocking the beta: fix first'],
  ['priority:2-design', '5319e7', 'Design value users see first'],
  ['priority:3-quality', '0e8a16', 'CI/CD and quality that protect delivery'],
  ['priority:4-later', 'c5def5', 'Valuable, after the levels above'],
]
const PRIORITY = {
  'reliable-board-sync': 1,
  'composer-and-colour-v3': 2, 'facilitator-controls-v2': 2, 'board-activity-feed': 2, 'design-system-components': 2, 'short-links-and-join': 2,
  'board-creation-v2': 2, 'presenter-mode-v2': 2, 'column-voting-scope': 2, 'recent-boards-visible': 2, 'board-recovery': 2, 'options-simple-mode': 2, 'join-by-link': 2, 'profile-simple-mode': 2, 'smart-title': 2, 'creation-voting': 2, 'creation-polish': 2, 'simple-advanced-mode': 2, 'identity-conflicts': 2, 'publishing-ux-redesign': 2,
  'postit-visual-system': 2, 'responsive-and-i18n-hardening': 2, 'profile-avatars-and-team-space': 2, 'activity-rings-timer': 2,
  'voting-results-charts': 2, 'cluster-reveal-motion': 2, 'column-tools': 2,
  'clusters-v2': 2, 'board-type-migration': 2,
  'column-visibility': 2, 'time-display-options': 2, 'presence-status': 2, 'note-pin': 2, 'button-icons-everywhere': 2, 'toolbar-mobile-scroll': 2, 'agenda-clock-v2': 2,
  'quality-gates-v2': 3, 'automated-semver-release': 3, 'allure-report-aggregation': 3, 'self-rename-event': 1, 'ci-toolchain-speed': 3, 'agentic-delivery-harness': 3, 'edge-security-and-domain': 3, 'accessibility-wcag': 3,
}
const priorityOf = (name) => PRIORITY_LEVELS[(PRIORITY[name] ?? 4) - 1][0]
// A change with every task ticked needs no priority (its issues only wait to be closed).
const prioLabels = (c) => (c.groups.some((g) => g.tasks.length) ? [priorityOf(c.name)] : [])
const LABELS = [
  ...PRIORITY_LEVELS,
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
  plan.push({ kind: 'epic', c, title: `[epic] ${name}`, body: epicBody(c, deps), labels: ['epic', `phase:${phase}`, `lane:${lane}`, ...prioLabels(c), ready ? 'agent:ready' : 'blocked'], phase })
  for (const g of c.groups.filter((x) => x.tasks.length)) plan.push({ kind: 'group', c, g, title: `[${name}] ${g.n}. ${g.title}`, body: groupBody(c, g), labels: ['task-group', `phase:${phase}`, `lane:${lane}`, ...prioLabels(c), ready && g.n === '1' ? 'agent:ready' : 'blocked'], phase, parent: `[epic] ${name}` })
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
  issues[p.title] = found ? gh('PATCH', `repos/${REPO}/issues/${found.number}`, { body: p.body, milestone: payload.milestone, labels: [...new Set([...found.labels.map((l) => l.name).filter((l) => !/^(agent:ready|blocked|priority:.+)$/.test(l)), ...p.labels])] }) : gh('POST', `repos/${REPO}/issues`, payload)
  console.log(`${found ? 'updated' : 'created'} #${issues[p.title].number} ${p.title}`)
}
for (const p of plan.filter((x) => x.kind === 'group')) {
  const parent = issues[p.parent]
  try { gh('POST', `repos/${REPO}/issues/${parent.number}/sub_issues`, { sub_issue_id: issues[p.title].id }) } catch { /* already linked */ }
}
console.log('Done. Create the project board in the GitHub UI and enable its "Auto-add to project" workflow for this repository.')
