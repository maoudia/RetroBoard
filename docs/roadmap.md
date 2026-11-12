# Roadmap

The roadmap lives in GitHub: release milestones in the repository and the organisation project
[RetroBoard roadmap](https://github.com/orgs/maoudia/projects/7). Each OpenSpec change is one epic issue in one
release; each task group of a change is one sub-issue (one pull request). Target dates are planning targets,
reviewed at each release. Plan of 2026-11-04: stabilise first, launch in December, then teams, revenue and agents. Re-planned 2026-11-12 (owner decisions): R2 is cut to the launch path, the nightly gate allows retries and a shrinking quarantine and leaves WebKit out, and the Cloudflare-independence changes are placed.

Priority (owner rule, 2026-10-29): bugs first (`priority:1-urgent`, standalone `bug` issues), then the design value
users see first (`priority:2-design`), then CI/CD quality (`priority:3-quality`), then the rest (`priority:4-later`).
Within a release, take the lowest priority number first. At most 3 changes are in progress at once.

Source of truth: `scripts/github/sync-issues.mjs` (`RELEASES`, `ROADMAP`, `PRIORITY`, `GROUP_OVERRIDES`). Run it with `--apply` after
adding or re-planning a change; the `Project roadmap` workflow then puts the issues on the project.

## Nightly gate (R1 and R2)

The nightly (`.github/workflows/nightly.yml`, every day at 02:41 UTC) runs the whole e2e suite: 21 jobs on Chromium,
Firefox, Pixel 7, TV and three desktop widths, and 8 WebKit jobs. A **night is green** when:

1. every job outside WebKit succeeded **after the retries**: the nightly retries a failed test twice (`playwright.config.ts`),
   and a test that passes on a retry is reported as flaky, not failed;
2. the only tests that failed after the retries are in the **quarantine** (below): `scripts/quality/quarantine-reporter.mjs`
   keeps them out of the job result. They still run and are still listed as failed in the report.

**WebKit is excluded from the gate.** It still runs and reports every night, but it never makes a night red (it renders in
software on the Linux runners and fails differently from run to run).

The **quarantine** is `tests/e2e/quarantine.json`: one entry per spec, with the projects it covers and the reason it is
quarantined. It only shrinks: `pnpm verify` (`pnpm quarantine`) fails above the ceiling in `quality/quarantine-baseline.json`
(target 0), and an entry whose spec file is gone is refused. Fix a spec and remove its entry, then lower the ceiling.
Never delete a test to empty the list.

The **streak** is `pnpm nightly:streak -- --target=7` (or `14`): the number of scheduled nightly runs in a row, newest
first, that were green by the definition above. The GitHub run list can still show a red run for a night that is green here
(a WebKit job); the streak is the gate. First possible 7th green night: 2026-11-19; first possible 14th: 2026-11-26, if
every night from 2026-11-13 is green.

## R1 Stabilisation (target 2026-11-15)

Feature freeze until main is green. Gate: 7 green nights in a row (nightly gate above), at most 3 changes in progress, landing truth fixes.

* `reliable-board-sync` ([proposal](../openspec/changes/reliable-board-sync/proposal.md))
* Delivered and archived: `community-feedback`, `quality-gates-v2`, `history-panel-phone-layout`, `solo-board-parity`, `prod-guardrails`, `join-code-committed-sas`, `derived-states-contrast`.
* Epic #443 `stabilise-main`: roadmap source of truth, WIP limit, landing truth and favicon, phone UX and docs truth pass are delivered; the trademark check is the owner's task. Hotfix waves are archived as soon as they are merged (last: `2026-11-05-hotfix-ux-wave8`).

## R2 Public launch (target 2026-12-13)

Launch path only (owner decision 2026-11-12): what the launch needs, nothing else. The R2 gate is 14 green nights in a row (nightly gate
above), CLA live, Lighthouse mobile above 95 on the landing, axe without violation on the public pages, the launch kit ready.
Anything not on this list slipped to R3.

* Nightly health: `agentic-delivery-harness` ([proposal](../openspec/changes/agentic-delivery-harness/proposal.md)), the nightly gate above, the quarantine and the streak.
* Accessibility gate: `a11y-gate-and-derived-contrast` ([proposal](../openspec/changes/a11y-gate-and-derived-contrast/proposal.md)), axe, contrast and keyboard specs in the push gate; Lighthouse.
* Safe deploys: `deploy-safe-sessions` ([proposal](../openspec/changes/deploy-safe-sessions/proposal.md)), a deploy during a retro no longer drops peer links or hides events of a newer client.
* Landing and launch kit: `landing-v2-and-product-video` ([proposal](../openspec/changes/landing-v2-and-product-video/proposal.md)), then `public-launch` (change to open: `/opsx:propose`).
* Brand identity: `brand-identity` (change to open: `/opsx:propose`).
* CLA: task group 1 of `open-source-business` (change to open: `/opsx:propose`); the group sits in R2, the rest of the change in R4.
* In flight, finish only: `p2p-presence-and-cursors` ([proposal](../openspec/changes/p2p-presence-and-cursors/proposal.md)) and `webmcp-browser-agents` ([proposal](../openspec/changes/webmcp-browser-agents/proposal.md)) have only a pull request and an owner check left.
* Delivered and archived: `user-manual-and-tutorials`, `short-links-and-join`, `retro-report`, `results-insights`, `voting-v2-and-ranking`, `responsive-and-i18n-hardening`, `activity-rings-timer`, `allure-report-aggregation`, `automated-semver-release`, `edge-security-and-domain`.

Moved to R3 on 2026-11-12: `design-system-components`, `ci-toolchain-speed`, `scorecard-hardening`, `code-health-for-agents` (change to open),
`note-edit-and-unpublish`, `note-zoom-on-double-tap`, `group-colors-menu-and-scope`, `column-defaults-and-collapse`, `chat-floating-dock`,
`chat-message-controls`, `phase-transition-guidance`, `simple-mode-ux-pass` and `join-code-drop-fallback`.

## R3 Teams and action follow-up (target 2027-01-31)

Team workspaces, carried-over actions, undo history, exports, UI polish. Gate: actions are taken over from one retro to the next.

* `attention-and-notifications` ([proposal](../openspec/changes/attention-and-notifications/proposal.md))
* `team-workspaces` ([proposal](../openspec/changes/team-workspaces/proposal.md))
* `results-trends` ([proposal](../openspec/changes/results-trends/proposal.md))
* `visual-regression` ([proposal](../openspec/changes/visual-regression/proposal.md))
* `agent-maintenance` ([proposal](../openspec/changes/agent-maintenance/proposal.md))
* `actions-v2-and-carry-over` ([proposal](../openspec/changes/actions-v2-and-carry-over/proposal.md))
* `profile-avatars-and-team-space` ([proposal](../openspec/changes/profile-avatars-and-team-space/proposal.md))
* `board-undo-rewind` ([proposal](../openspec/changes/board-undo-rewind/proposal.md))
* `export-hub` ([proposal](../openspec/changes/export-hub/proposal.md))
* `export-destinations-v2` ([proposal](../openspec/changes/export-destinations-v2/proposal.md))
* `user-drive-storage` ([proposal](../openspec/changes/user-drive-storage/proposal.md))
* `postit-visual-system` ([proposal](../openspec/changes/postit-visual-system/proposal.md))
* `publishing-ux-redesign` ([proposal](../openspec/changes/publishing-ux-redesign/proposal.md))
* `board-creation-v2` ([proposal](../openspec/changes/board-creation-v2/proposal.md))
* `cluster-reveal-motion` ([proposal](../openspec/changes/cluster-reveal-motion/proposal.md))
* `facilitator-moderation` ([proposal](../openspec/changes/facilitator-moderation/proposal.md))
* `talk-time-v2` ([proposal](../openspec/changes/talk-time-v2/proposal.md))
* `up-down-votes` ([proposal](../openspec/changes/up-down-votes/proposal.md))
* `calendar-agenda-import` ([proposal](../openspec/changes/calendar-agenda-import/proposal.md))
* `design-system-components` ([proposal](../openspec/changes/design-system-components/proposal.md))
* `ci-toolchain-speed` ([proposal](../openspec/changes/ci-toolchain-speed/proposal.md))
* `scorecard-hardening` ([proposal](../openspec/changes/scorecard-hardening/proposal.md))
* `code-health-for-agents` (change to open: `/opsx:propose`; its formatting commit conflicts with every open pull request: the week after the launch)
* `note-edit-and-unpublish` ([proposal](../openspec/changes/note-edit-and-unpublish/proposal.md))
* `note-zoom-on-double-tap` ([proposal](../openspec/changes/note-zoom-on-double-tap/proposal.md))
* `group-colors-menu-and-scope` ([proposal](../openspec/changes/group-colors-menu-and-scope/proposal.md))
* `column-defaults-and-collapse` ([proposal](../openspec/changes/column-defaults-and-collapse/proposal.md))
* `chat-floating-dock` ([proposal](../openspec/changes/chat-floating-dock/proposal.md))
* `chat-message-controls` ([proposal](../openspec/changes/chat-message-controls/proposal.md))
* `phase-transition-guidance` ([proposal](../openspec/changes/phase-transition-guidance/proposal.md))
* `simple-mode-ux-pass` ([proposal](../openspec/changes/simple-mode-ux-pass/proposal.md))
* `join-code-drop-fallback` ([proposal](../openspec/changes/join-code-drop-fallback/proposal.md))
* `local-data-durability` ([proposal](../openspec/changes/local-data-durability/proposal.md)), the browser is the only copy of a board: persistence status, sealed drafts
* `portable-relay-core` ([proposal](../openspec/changes/portable-relay-core/proposal.md)), see Cloudflare independence below

## R4 Monetisation and growth (target 2027-03-14)

Licensing, offers, sponsors, marketplace, services, premium themes. Gate: first sale collected. The CLA group of `open-source-business` is in R2.

* `licensing-and-monetization` ([proposal](../openspec/changes/licensing-and-monetization/proposal.md))
* `themes-pop-culture` ([proposal](../openspec/changes/themes-pop-culture/proposal.md))
* `open-source-business` (change to open: `/opsx:propose`)

## R5 Agents (target 2027-05-02)

MCP server, agent sessions, local AI companion. Gate: an agent runs a retro end to end.

* `retro-mcp-and-agent-sessions` ([proposal](../openspec/changes/retro-mcp-and-agent-sessions/proposal.md))
* `local-ai-companion` ([proposal](../openspec/changes/local-ai-companion/proposal.md))
* `funny-local-companion` ([proposal](../openspec/changes/funny-local-companion/proposal.md))
* `agent-feedback-and-timeboxed-sessions` ([proposal](../openspec/changes/agent-feedback-and-timeboxed-sessions/proposal.md))
* `agents-first-class` ([proposal](../openspec/changes/agents-first-class/proposal.md))

## Cloudflare independence

RetroBoard must not depend on Cloudflare services: Workers stays the zero-cost hosted target (ADR-0001, ADR-0018), one deploy
target among others. The work was open without a release; it is placed by what the launch needs.

| Change | Release | Why there |
|---|---|---|
| `deploy-safe-sessions` | R2 | Production deploys several times a day and a retro lasts an hour: the launch cannot drop peer links on every deploy |
| `a11y-gate-and-derived-contrast` | R2 | Launch gate (axe without violation); nightly failed on axe checks |
| `local-data-durability` | R3 | Protects the one copy of a board in the browser; not a launch blocker |
| `portable-relay-core` | R3 | Runtime-neutral relay core, thin Durable Object adapter and a Node adapter for the self-host container; not a launch blocker |

The follow-ups named in the `portable-relay-core` proposal (`rtc-config-and-deploy-targets`, `selfhost-container-gate`) are not yet changes of their own.
