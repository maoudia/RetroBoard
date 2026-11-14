#!/usr/bin/env node
// Creates or updates GitHub milestones, labels, epic issues (one per OpenSpec change)
// and sub-issues (one per task group) from openspec/changes. Idempotent: matches by title.
// Usage: node scripts/github/sync-issues.mjs [--apply] [--repo owner/name]
// Without --apply it only prints what it would do. Requires the gh CLI (REST only).
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { finishedTitles } from './finished.mjs'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const REPO = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : 'maoudia/RetroBoard'
const ROOT = new URL('../../', import.meta.url).pathname
const CHANGES = join(ROOT, 'openspec/changes')

// Phase, lane and dependencies mirror docs/architecture.md section 12.
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
  'boards-menu-new': ['P9', 'B', []],
  'private-mode-recovery': ['P9', 'B', []],
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
  // Owner feedback 2026-11-02: secure by default, coherent UI, parity, teams, insights, community.
  'password-by-default': ['P10', 'A', []],
  'ui-coherence-pass': ['P10', 'B', []],
  'mode-parity': ['P10', 'B', []],
  'community-feedback': ['P10', 'C', []],
  'device-layout-prefs': ['P10', 'B', []],
  'solo-parity-and-dedup': ['P10', 'A', []],
  'results-insights': ['P10', 'C', []],
  'team-workspaces': ['P10', 'A', []],
  // Live retro feedback 2026-11-02 (phone screenshot): room to work on phones, layout by drag, editing, chat.
  'mobile-board-space': ['P11', 'A', []],
  'board-layout-v2': ['P11', 'B', []],
  'presenter-accordion-motion': ['P11', 'C', []],
  'edit-published-notes': ['P11', 'A', []],
  'board-chat': ['P11', 'C', []],
  'ux-irritants-wave-2': ['P11', 'A', []],
  'ux-irritants-wave-3': ['P11', 'A', []],
  'toast-notifications-v2': ['P11', 'A', []],
  // Owner feedback 2026-11-03 (ten screenshots): picture fixes ship next, features are spec only.
  'feedback-wave-4': ['P11', 'B', []],
  'feedback-wave-5': ['P11', 'B', []],
  'feedback-wave-6': ['P11', 'B', []],
  'feedback-wave-7': ['P11', 'B', []],
  'user-manual-and-tutorials': ['P12', 'C', []],
  'vote-all-on-one-idea': ['P12', 'B', ['up-down-votes']],
  'board-undo-rewind': ['P12', 'A', []],
  // Owner feedback 2026-11-08 (phone screenshot and a list of features and fixes): each one has its change.
  'history-panel-phone-layout': ['P14', 'A', []],
  'solo-board-parity': ['P14', 'A', []],
  'note-edit-and-unpublish': ['P14', 'B', []],
  'note-zoom-on-double-tap': ['P14', 'B', []],
  'group-colors-menu-and-scope': ['P14', 'C', []],
  'column-defaults-and-collapse': ['P14', 'C', []],
  'chat-floating-dock': ['P14', 'A', []],
  'chat-message-controls': ['P14', 'A', ['chat-floating-dock']],
  'scorecard-hardening': ['P14', 'B', []],
  'phase-transition-guidance': ['P14', 'B', []],
  'simple-mode-ux-pass': ['P14', 'C', ['column-defaults-and-collapse']],
  'attention-and-notifications': ['P14', 'C', []],
  'prod-guardrails': ['P14', 'A', []],
  'deploy-safe-sessions': ['P14', 'B', []],
  'join-code-committed-sas': ['P14', 'C', []],
  'local-data-durability': ['P14', 'C', []],
  'a11y-gate-and-derived-contrast': ['P14', 'C', []],
  'derived-states-contrast': ['P14', 'C', []],
  'join-code-drop-fallback': ['P14', 'C', ['join-code-committed-sas']],
  'results-trends': ['P12', 'C', ['team-workspaces']],
  'visual-regression': ['P12', 'B', []],
  'agent-maintenance': ['P12', 'B', []],
  'export-destinations-v2': ['P12', 'B', ['export-hub']],
  'user-drive-storage': ['P12', 'A', []],
  'agent-feedback-and-timeboxed-sessions': ['P12', 'C', ['retro-mcp-and-agent-sessions', 'agents-first-class']],
  'funny-local-companion': ['P12', 'C', ['local-ai-companion']],
  // Roadmap review 2026-11-04 (docs: diagnosis, vision, roadmap, business plan).
  'stabilise-main': ['P13', 'A', []],
  'hotfix-ux-wave8': ['P13', 'A', []],
  'brand-identity': ['P13', 'B', []],
  'code-health-for-agents': ['P13', 'C', []],
  'public-launch': ['P13', 'B', ['brand-identity']],
  'open-source-business': ['P13', 'A', []],
  // Cloudflare-independence report 2026-11-11: the relay core and the Node adapter.
  'portable-relay-core': ['P14', 'A', []],
}
const PHASES = {
  P0: 'P0 Foundations', P1: 'P1 Zero-storage core', P2: 'P2 Retro flow', P3: 'P3 UX',
  P4: 'P4 Outputs', P5: 'P5 Agents', P6: 'P6 Growth', P7: 'P7 Owner feedback 2026-10-25', P8: 'P8 Owner feedback 2026-10-29', P9: 'P9 Owner feedback 2026-11-01', P10: 'P10 Owner feedback 2026-11-02', P11: 'P11 Live retro feedback 2026-11-02', P12: 'P12 Ideas backlog 2026-11-03', P13: 'P13 Roadmap 2026-11-04', P14: 'P14 Owner feedback 2026-11-08',
}
// Roadmap: every change belongs to one release milestone (the GitHub roadmap is built from these).
// Target dates are planning targets, revisited at each release review.
const RELEASES = {
  // Re-planned 2026-11-04 (roadmap review): R1 stabilises, R2 is the public launch, R3 teams and action follow-up,
  // R4 monetisation and growth, R5 agents. Titles are unchanged so existing issues keep their milestone.
  // R2 cut to the launch path on 2026-11-12 (owner decision): what is not on it slipped to R3.
  R1: { title: 'R1 Beta ready', due: '2026-11-15', description: 'Stabilisation (plan 2026-11-04): feature freeze, main green, WIP limit, landing truth fixes. Gate: the nightly streak (docs/roadmap.md).' },
  R2: { title: 'R2 Facilitation and visuals', due: '2026-12-13', description: 'Public launch, launch path only (plan 2026-11-12): nightly health, accessibility gate, brand identity, CLA, landing v2, launch kit, Lighthouse mobile above 95.' },
  R3: { title: 'R3 Teams and themes', due: '2027-01-31', description: 'Teams and action follow-up (plan 2026-11-04): team workspaces, carried-over actions, undo history, exports, polish; the R2 work off the launch path; Cloudflare independence.' },
  R4: { title: 'R4 Agents and growth', due: '2027-03-14', description: 'Monetisation and growth (plan 2026-11-04): licensing, offers, sponsors, marketplace, services, premium themes.' },
  R5: { title: 'R5 Agents', due: '2027-05-02', description: 'Agents (plan 2026-11-04): MCP, agent sessions, local AI companion.' },
  PARKED: { title: 'Parked', due: null, description: 'On hold by owner decision.' },
}

// Release of each open change (plan 2026-11-04). Archived changes need no entry.
const ROADMAP = {
  'reliable-board-sync': 'R1',
  'community-feedback': 'R1',
  'quality-gates-v2': 'R1',
  'landing-v2-and-product-video': 'R2',
  'user-manual-and-tutorials': 'R2',
  'short-links-and-join': 'R2',
  'retro-report': 'R2',
  'results-insights': 'R2',
  'design-system-components': 'R3',
  'responsive-and-i18n-hardening': 'R2',
  'voting-v2-and-ranking': 'R2',
  'activity-rings-timer': 'R2',
  'p2p-presence-and-cursors': 'R2',
  'webmcp-browser-agents': 'R2',
  'allure-report-aggregation': 'R2',
  'history-panel-phone-layout': 'R1',
  'solo-board-parity': 'R1',
  'prod-guardrails': 'R1',
  'deploy-safe-sessions': 'R2',
  'join-code-committed-sas': 'R1',
  'join-code-drop-fallback': 'R3',
  'local-data-durability': 'R3',
  'a11y-gate-and-derived-contrast': 'R2',
  'derived-states-contrast': 'R1',
  'note-edit-and-unpublish': 'R3',
  'note-zoom-on-double-tap': 'R3',
  'group-colors-menu-and-scope': 'R3',
  'column-defaults-and-collapse': 'R3',
  'chat-floating-dock': 'R3',
  'chat-message-controls': 'R3',
  'scorecard-hardening': 'R3',
  'phase-transition-guidance': 'R3',
  'simple-mode-ux-pass': 'R3',
  'attention-and-notifications': 'R3',
  'automated-semver-release': 'R2',
  'ci-toolchain-speed': 'R3',
  'edge-security-and-domain': 'R2',
  'agentic-delivery-harness': 'R2',
  'team-workspaces': 'R3',
  'results-trends': 'R3',
  'visual-regression': 'R3',
  'agent-maintenance': 'R3',
  'actions-v2-and-carry-over': 'R3',
  'profile-avatars-and-team-space': 'R3',
  'board-undo-rewind': 'R3',
  'export-hub': 'R3',
  'export-destinations-v2': 'R3',
  'user-drive-storage': 'R3',
  'postit-visual-system': 'R3',
  'publishing-ux-redesign': 'R3',
  'board-creation-v2': 'R3',
  'cluster-reveal-motion': 'R3',
  'facilitator-moderation': 'R3',
  'talk-time-v2': 'R3',
  'up-down-votes': 'R3',
  'calendar-agenda-import': 'R3',
  'licensing-and-monetization': 'R4',
  'themes-pop-culture': 'R4',
  'retro-mcp-and-agent-sessions': 'R5',
  'local-ai-companion': 'R5',
  'funny-local-companion': 'R5',
  'agent-feedback-and-timeboxed-sessions': 'R5',
  'agents-first-class': 'R5',
  'stabilise-main': 'R1',
  'hotfix-ux-wave8': 'R1',
  'brand-identity': 'R2',
  'code-health-for-agents': 'R3',
  'public-launch': 'R2',
  'open-source-business': 'R4',
  'portable-relay-core': 'R3',
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
  'community-feedback': 1,
  'quality-gates-v2': 1,
  'landing-v2-and-product-video': 2,
  'user-manual-and-tutorials': 2,
  'history-panel-phone-layout': 1,
  'solo-board-parity': 1,
  'prod-guardrails': 1,
  'deploy-safe-sessions': 1,
  'join-code-committed-sas': 1,
  'join-code-drop-fallback': 1,
  'local-data-durability': 2,
  'a11y-gate-and-derived-contrast': 1,
  'note-edit-and-unpublish': 2,
  'note-zoom-on-double-tap': 2,
  'group-colors-menu-and-scope': 2,
  'column-defaults-and-collapse': 2,
  'chat-floating-dock': 2,
  'chat-message-controls': 2,
  'scorecard-hardening': 2,
  'phase-transition-guidance': 2,
  'simple-mode-ux-pass': 2,
  'attention-and-notifications': 3,
  'short-links-and-join': 2,
  'retro-report': 2,
  'results-insights': 2,
  'design-system-components': 2,
  'responsive-and-i18n-hardening': 2,
  'voting-v2-and-ranking': 2,
  'activity-rings-timer': 2,
  'p2p-presence-and-cursors': 3,
  'webmcp-browser-agents': 3,
  'allure-report-aggregation': 3,
  'automated-semver-release': 3,
  'ci-toolchain-speed': 3,
  'edge-security-and-domain': 3,
  'agentic-delivery-harness': 3,
  'team-workspaces': 2,
  'results-trends': 2,
  'visual-regression': 3,
  'agent-maintenance': 3,
  'actions-v2-and-carry-over': 2,
  'profile-avatars-and-team-space': 4,
  'board-undo-rewind': 4,
  'export-hub': 4,
  'export-destinations-v2': 4,
  'user-drive-storage': 4,
  'postit-visual-system': 4,
  'publishing-ux-redesign': 4,
  'board-creation-v2': 4,
  'cluster-reveal-motion': 4,
  'facilitator-moderation': 4,
  'talk-time-v2': 4,
  'up-down-votes': 4,
  'calendar-agenda-import': 4,
  'licensing-and-monetization': 4,
  'themes-pop-culture': 4,
  'retro-mcp-and-agent-sessions': 4,
  'local-ai-companion': 4,
  'funny-local-companion': 4,
  'agent-feedback-and-timeboxed-sessions': 4,
  'agents-first-class': 4,
  'stabilise-main': 1,
  'hotfix-ux-wave8': 1,
  'brand-identity': 2,
  'code-health-for-agents': 3,
  'public-launch': 2,
  'open-source-business': 4,
}
// A task group can sit in another release or priority than its change (plan 2026-11-04): key `change:group number`.
const GROUP_OVERRIDES = {
  'stabilise-main:5': { priority: 3 },
  'open-source-business:1': { release: 'R2', priority: 3 },
  // Production audit 2026-11-09: removal is undone by a new tab until the fresh link ships; snapshots bound what a relay-only joiner gets.
  'facilitator-moderation:2': { release: 'R1', priority: 1 },
  'p2p-presence-and-cursors:4': { priority: 2 },
}
// A change with every task ticked needs no priority (its issues only wait to be closed).
const prioLabels = (c, g) => {
  if (!c.groups.some((x) => x.tasks.length)) return []
  const level = (g && GROUP_OVERRIDES[`${c.name}:${g.n}`]?.priority) ?? PRIORITY[c.name] ?? 4
  return [PRIORITY_LEVELS[level - 1][0]]
}
const releaseOf = (c, g) => RELEASES[(g && GROUP_OVERRIDES[`${c.name}:${g.n}`]?.release) ?? ROADMAP[c.name]]
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
  `- Claude Code: \`/openspec-apply-change ${c.name}\` and work only on group ${g.n}`,
  `- OpenCode: ask for the \`openspec-apply-change\` skill on \`${c.name}\` and work only on group ${g.n}`,
  `- PR body must contain \`Change: ${c.name}\`; tick the tasks in \`openspec/changes/${c.name}/tasks.md\`; run \`npm run verify\`.`,
].join('\n')

const plan = []
for (const name of ordered) {
  const c = readChange(name)
  const [phase, lane, deps] = PLAN[name]
  // A dependency is done once its change is archived (no longer in openspec/changes).
  const ready = deps.every((d) => !changes.includes(d)) && ROADMAP[name] !== 'PARKED'
  plan.push({ kind: 'epic', c, title: `[epic] ${name}`, body: epicBody(c, deps), labels: ['epic', `phase:${phase}`, `lane:${lane}`, ...prioLabels(c), ready ? 'agent:ready' : 'blocked'], phase })
  for (const g of c.groups.filter((x) => x.tasks.length)) plan.push({ kind: 'group', c, g, title: `[${name}] ${g.n}. ${g.title}`, body: groupBody(c, g), labels: ['task-group', `phase:${phase}`, `lane:${lane}`, ...prioLabels(c, g), ready && g.n === '1' ? 'agent:ready' : 'blocked'], phase, parent: `[epic] ${name}` })
}

console.log(`${APPLY ? 'Applying' : 'Dry run'} on ${REPO}: ${Object.keys(RELEASES).length} release milestones, ${LABELS.length} labels, ${plan.filter((p) => p.kind === 'epic').length} epics, ${plan.filter((p) => p.kind === 'group').length} task-group issues`)
const finished = finishedTitles(CHANGES)
if (!APPLY) {
  for (const p of plan) console.log(`${p.kind === 'epic' ? '' : '   '}${p.title}  [${p.labels.join(', ')}]`)
  console.log(`\nFinished, closed by --apply (${finished.length}):`)
  for (const t of finished) console.log(`   ${t}`)
  process.exit(0)
}

const existingLabels = new Set(ghAll(`repos/${REPO}/labels?per_page=100`).map((l) => l.name))
for (const [name, color, description] of LABELS) if (!existingLabels.has(name)) gh('POST', `repos/${REPO}/labels`, { name, color, description })
const milestones = Object.fromEntries(ghAll(`repos/${REPO}/milestones?state=all&per_page=100`).map((m) => [m.title, m.number]))
for (const r of Object.values(RELEASES)) {
  const body = { title: r.title, description: r.description, state: 'open', ...(r.due ? { due_on: `${r.due}T23:59:59Z` } : {}) }
  milestones[r.title] = milestones[r.title] ? gh('PATCH', `repos/${REPO}/milestones/${milestones[r.title]}`, body).number : gh('POST', `repos/${REPO}/milestones`, body).number
}
const issues = Object.fromEntries(ghAll(`repos/${REPO}/issues?state=all&per_page=100`).filter((i) => !i.pull_request).map((i) => [i.title, i]))
for (const p of plan) {
  const payload = { title: p.title, body: p.body, labels: p.labels, milestone: milestones[releaseOf(p.c, p.g).title] }
  const found = issues[p.title]
  issues[p.title] = found ? gh('PATCH', `repos/${REPO}/issues/${found.number}`, { body: p.body, milestone: payload.milestone, labels: [...new Set([...found.labels.map((l) => l.name).filter((l) => !/^(agent:ready|blocked|priority:.+)$/.test(l)), ...p.labels])] }) : gh('POST', `repos/${REPO}/issues`, payload)
  console.log(`${found ? 'updated' : 'created'} #${issues[p.title].number} ${p.title}`)
}
for (const p of plan.filter((x) => x.kind === 'group')) {
  const parent = issues[p.parent]
  try { gh('POST', `repos/${REPO}/issues/${parent.number}/sub_issues`, { sub_issue_id: issues[p.title].id }) } catch { /* already linked */ }
}
// Finished task groups and epics close themselves, with a note saying why.
let closed = 0
for (const title of finished) {
  const open = issues[title]
  if (!open || open.state === 'closed') continue
  gh('POST', `repos/${REPO}/issues/${open.number}/comments`, { body: 'Closed by sync-issues: every task of this item is ticked in openspec (or its change is archived).' })
  gh('PATCH', `repos/${REPO}/issues/${open.number}`, { state: 'closed', state_reason: 'completed' })
  closed++
  console.log(`closed #${open.number} ${title}`)
}
console.log(`${closed} finished issue(s) closed.`)
console.log('Done. Create the project board in the GitHub UI and enable its "Auto-add to project" workflow for this repository.')
