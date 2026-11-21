# Roadmap

The roadmap lives in GitHub: release milestones in the repository and the organisation project
[RetroBoard roadmap](https://github.com/orgs/maoudia/projects/7). Each OpenSpec change is one epic issue in one
release; each task group of a change is one sub-issue (one pull request). Target dates are planning targets,
reviewed at each release. Plan of 2026-11-04: stabilise first, launch in December, then teams, revenue and agents. Re-planned 2026-11-12 (owner decisions): R2 is cut to the launch path, the nightly gate allows retries and a shrinking quarantine and leaves WebKit out, and the Cloudflare-independence changes are placed. Extended 2026-11-20 with the owner's product notes (section "Owner notes of 2026-11-20" below): feature freeze on 2026-12-09, so only the two bug fixes and the first three groups of `sync-ux` may ship before the launch.

Priority (owner rule, 2026-10-29): bugs first (`priority:1-urgent`, standalone `bug` issues), then the design value
users see first (`priority:2-design`), then CI/CD quality (`priority:3-quality`), then the rest (`priority:4-later`).
Within a release, take the lowest priority number first. At most 3 changes are in progress at once.
Manual checks only the owner can run live in [owner-checks.md](owner-checks.md) (R1 and R2), not in open changes.

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

* `reliable-board-sync` ([proposal](../openspec/changes/archive/2026-11-12-reliable-board-sync/proposal.md))
* Delivered and archived: `community-feedback`, `quality-gates-v2`, `history-panel-phone-layout`, `solo-board-parity`, `prod-guardrails`, `join-code-committed-sas`, `derived-states-contrast`.
* Epic #443 `stabilise-main`: roadmap source of truth, WIP limit, landing truth and favicon, phone UX and docs truth pass are delivered; the trademark check is the owner's task. Hotfix waves are archived as soon as they are merged (last: `2026-11-05-hotfix-ux-wave8`).

## R2 Public launch (target 2026-12-13)

Launch path only (owner decision 2026-11-12): what the launch needs, nothing else. The R2 gate is 14 green nights in a row (nightly gate
above), Lighthouse mobile above 95 on the landing, axe without violation on the public pages, the launch kit ready.
Anything not on this list slipped to R3.

* Nightly health: the nightly gate above, the quarantine and the streak. Delivered and archived: `agentic-delivery-harness` ([proposal](../openspec/changes/archive/2026-11-14-agentic-delivery-harness/proposal.md)).
* Accessibility gate: `a11y-gate-and-derived-contrast` ([proposal](../openspec/changes/a11y-gate-and-derived-contrast/proposal.md)), axe, contrast and keyboard specs in the push gate; Lighthouse.
* Safe deploys: `deploy-safe-sessions` ([proposal](../openspec/changes/deploy-safe-sessions/proposal.md)), a deploy during a retro no longer drops peer links or hides events of a newer client.
* Landing and launch kit: `landing-v2-and-product-video` ([proposal](../openspec/changes/landing-v2-and-product-video/proposal.md)), then `public-launch` ([proposal](../openspec/changes/public-launch/proposal.md)): indexing of the public pages, one page per retro format, the launch kit and `pnpm launch:check`, the readiness check of the gate above.
* Encrypted sync of boards and preferences to a folder the user picks: `user-drive-storage` ([proposal](../openspec/changes/user-drive-storage/proposal.md)), priority 1 (`priority:1-urgent`), task groups 1 (the `SyncTarget` interface, the browser adapter, local encryption, the board library, the contract tests and the in-memory fake) and 2 (the vault engine with its merge rules, the folder adapter and Preferences > Sync: automatic push and pull, status, disconnect and forget). It is Joplin's "File system" target: the user's own sync client (OneDrive, Drive, Dropbox, iCloud, Syncthing, Nextcloud) carries the encrypted files, so R2 needs no sign-in, no Microsoft registration and no CSP change. Chromium desktop only in R2. Groups 3 to 10 (OneDrive through Graph first, then GitHub, Google Drive, Dropbox, WebDAV, S3, generic HTTP, device pairing) sit in R3 as sub-issues of the same epic.
  The R2 scope grew by this item on 2026-11-14 at the owner's request. Estimate: two groups, one PR each, about 14 agent sessions of two hours in all (about 6 and 8), on top of the launch-path items above and under the limit of 3 changes in progress; smaller than the OneDrive-first plan (about 16 sessions plus the owner's Entra registration) because there is no OAuth, registration or CSP work. The 2026-12-13 target holds if group 1 is merged by 2026-11-27 and group 2 by 2026-12-08; the owner's only task is a live check with a folder carried by their own sync client. If group 2 is late, R2 keeps group 1 (the local library and the encrypted vault format, no sync yet) and group 2 ships right after the launch; the owner decides at the 2026-12-04 review.
* Sync UX, the product around the sync engine (owner notes 2026-11-20): `sync-ux` ([proposal](../openspec/changes/sync-ux/proposal.md)), priority 1. Groups 1 to 3 are R2 and small: the shield button (press to sync now), any folder, the onboarding sheet and its once-only nudge. They can ship before the 2026-12-09 freeze (about 5 sessions in all, one pull request each); if capacity is short they ship right after the launch, never at the cost of the launch-path items. Groups 4 to 6 (sealed vault file, pairing without a platform, phones) are R3.
* Two bugs from the owner's notes of 2026-11-20, both small and both allowed before the freeze: `fix-group-with-menu-layout` ([proposal](../openspec/changes/fix-group-with-menu-layout/proposal.md)) and `fix-votes-after-format-change` ([proposal](../openspec/changes/fix-votes-after-format-change/proposal.md)).
* Brand identity: `brand-identity` ([proposal](../openspec/changes/brand-identity/proposal.md)): charter, logo, icon kit, share images and press kit; the mark and the signature wait for the owner's approval.
* License: the project is source available under PolyForm Noncommercial 1.0.0 and closed to outside contributions ([ADR-0040](adr/0040-polyform-noncommercial-source-available-license.md)), so the launch path has no CLA, pricing or sponsorware decision.
* Archived, owner check left: `p2p-presence-and-cursors` ([proposal](../openspec/changes/archive/2026-11-12-p2p-presence-and-cursors/proposal.md)) and `webmcp-browser-agents` ([proposal](../openspec/changes/archive/2026-11-12-webmcp-browser-agents/proposal.md)) are delivered; only the owner checks in [owner-checks.md](owner-checks.md) remain.
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
* `code-health-for-agents` (change to open: `openspec-propose`; its formatting commit conflicts with every open pull request: the week after the launch)
* `note-edit-and-unpublish` ([proposal](../openspec/changes/note-edit-and-unpublish/proposal.md))
* `note-zoom-on-double-tap` ([proposal](../openspec/changes/note-zoom-on-double-tap/proposal.md))
* `group-colors-menu-and-scope` ([proposal](../openspec/changes/group-colors-menu-and-scope/proposal.md))
* `column-defaults-and-collapse` ([proposal](../openspec/changes/column-defaults-and-collapse/proposal.md))
* `chat-floating-dock` ([proposal](../openspec/changes/chat-floating-dock/proposal.md))
* `chat-message-controls` ([proposal](../openspec/changes/chat-message-controls/proposal.md))
* `phase-transition-guidance` ([proposal](../openspec/changes/phase-transition-guidance/proposal.md))
* `simple-mode-ux-pass` ([proposal](../openspec/changes/simple-mode-ux-pass/proposal.md))
* `join-code-drop-fallback` ([proposal](../openspec/changes/join-code-drop-fallback/proposal.md))
* `phase-controls` ([proposal](../openspec/changes/phase-controls/proposal.md)), per-phase capability switches in advanced mode and the lock on post-its (owner notes 2026-11-20)
* `creation-team-first` ([proposal](../openspec/changes/creation-team-first/proposal.md)), team and project at the top of board creation, in both modes
* `cursors-off-for-now` ([proposal](../openspec/changes/cursors-off-for-now/proposal.md)), shared pointers paused behind a flag
* `publish-announcements` ([proposal](../openspec/changes/publish-announcements/proposal.md)), "Alex published 4 ideas to Wish List"
* `done-celebration` ([proposal](../openspec/changes/done-celebration/proposal.md)), a per-theme animation when an idea is done
* `export-consolidation` ([proposal](../openspec/changes/export-consolidation/proposal.md)), three doors for data leaving the app
* `local-data-durability` ([proposal](../openspec/changes/local-data-durability/proposal.md)), the browser is the only copy of a board: persistence status, sealed drafts
* Delivered and archived: `portable-relay-core` ([proposal](../openspec/changes/archive/2026-11-14-portable-relay-core/proposal.md)), see Cloudflare independence below

## R4 Monetisation and growth (target 2027-03-14)

Licensing, offers, sponsors, marketplace, services, premium themes. Gate: first sale collected.

* `licensing-and-monetization` ([proposal](../openspec/changes/licensing-and-monetization/proposal.md)): shelved on 2026-11-19, see ADR-0040
* `themes-pop-culture` ([proposal](../openspec/changes/themes-pop-culture/proposal.md))
* `scrum-poker` ([proposal](../openspec/changes/scrum-poker/proposal.md)), **epic**: planning poker rooms, the growth item of R4 now that monetisation is shelved; it can move to R3 if R3 shrinks
* `poker-design-v2` ([proposal](../openspec/changes/poker-design-v2/proposal.md)), priority 2 (`priority:2-design`): the design of the poker room, written first after the owner's phone screenshot of 2026-11-21 (33 measured defects, wireframes per screen class and state, six task groups ordered so that the card and the hand and the phone room in one viewport come first); it delivers the presentation of tasks 3.1 and 3.2 of `scrum-poker`. It sits with its epic in R4; its groups 1 and 2 can move to R3 (one `GROUP_OVERRIDES` line each) if the owner decides the beta must look right before it is promoted
* `jira-estimation-import` ([proposal](../openspec/changes/jira-estimation-import/proposal.md)): Jira stories in by paste and CSV, estimates back, after `scrum-poker`
* `open-source-business` ([proposal](../openspec/changes/open-source-business/proposal.md)): shelved on 2026-11-19, see ADR-0040 (no CLA, sponsorware, offers or prices)

## R5 Agents (target 2027-05-02)

MCP server, agent sessions, local AI companion. Gate: an agent runs a retro end to end.

* `retro-mcp-and-agent-sessions` ([proposal](../openspec/changes/retro-mcp-and-agent-sessions/proposal.md))
* `local-ai-companion` ([proposal](../openspec/changes/local-ai-companion/proposal.md))
* `funny-local-companion` ([proposal](../openspec/changes/funny-local-companion/proposal.md))
* `agent-feedback-and-timeboxed-sessions` ([proposal](../openspec/changes/agent-feedback-and-timeboxed-sessions/proposal.md))
* `agents-first-class` ([proposal](../openspec/changes/agents-first-class/proposal.md))

## Owner notes of 2026-11-20

Fifteen notes became eleven changes (note 9, desktop mode works well, is information only). Sizes: S is one agent session of about two hours, M is three to five, L is six or more. The sizes are planning estimates, not measurements.

| Note | Change | Release | Size | Why there |
|---|---|---|---|---|
| 3 | `fix-group-with-menu-layout` | R2, before the freeze | S | A visible bug in a daily menu; a geometry test keeps it fixed |
| 4 | `fix-votes-after-format-change` | R2, before the freeze | S | Votes shown but not counted is a trust bug; one rule fixes it |
| 12, 13, 14 | `sync-ux` groups 1 to 3 | R2, before the freeze if capacity allows | S, S, M | Encrypted sync is priority 1 and unusable if nobody finds it; small, no new infrastructure |
| 12, 13, 14 | `sync-ux` groups 4 to 6 | R3 | M, L, M | Sealed vault file, pairing and phone fixes need a spike, a protocol check and real-device tests (owner's Microsoft app registration, an iPhone and an Android phone) |
| 8 | `cursors-off-for-now` | R3 (can ride before the freeze) | S | Removes an unreliable feature; a flag, not a deletion; low risk if capacity appears |
| 7 | `creation-team-first` | R3 | S | Reorders creation and adds team and project to simple mode; precursor of the `board-creation-v2` stepper |
| 5, 6 | `phase-controls` | R3 | L | A domain change (phase policy) with a compatibility rule; not a launch item |
| 2 | `publish-announcements` | R3 | M | A derived toast and a setting; no relay traffic |
| 1 | `done-celebration` | R3 | M | Eleven themed effects and an off switch; a polish item |
| 15 | `export-consolidation` | R3 | M | Sits after `export-hub`; shapes where `export-destinations-v2` and the vault file land |
| 10 | `scrum-poker` | R4, explicit epic | L (about 16 to 20 sessions) | Largest item; starts with an architecture spike and an ADR; after the launch and the sync work |
| 11 | `jira-estimation-import` | R4 | M | Needs the poker room; paste and CSV first, because a token or a secret of ours is refused |

Dependencies and cross-links: `sync-ux` extends `user-drive-storage` (its group 10, pairing, is replaced by `sync-ux` group 5) and shares the `.rbv` file with `local-data-durability` and `export-destinations-v2`; `export-consolidation` relates to `export-hub` and `export-destinations-v2`; `scrum-poker` reuses the primitives of sealed voting and the export doors; `jira-estimation-import` needs `scrum-poker`. Three ADRs were proposed with these changes: [0041](adr/0041-sync-without-a-platform-the-sealed-vault-file-and-device-pai.md) and [0043](adr/0043-jira-estimates-come-in-by-paste-and-csv-never-by-a-token.md) are still proposed, and [0042](adr/0042-a-poker-room-is-a-second-room-kind-on-the-same-transport.md) was accepted on 2026-11-21 after the spike of `scrum-poker` task 1.1, which unblocks group 1.2.

Before the 2026-12-09 freeze the work-in-progress ceiling still applies (`pnpm wip`): the new changes have no ticked task, so they add nothing to it until a group is started, and no more than three of them should be in progress at once. The GitHub issues for these changes are created from `scripts/github/sync-issues.mjs` and are not yet applied.

## Cloudflare independence

RetroBoard must not depend on Cloudflare services: Workers stays the zero-cost hosted target (ADR-0001, ADR-0018), one deploy
target among others. The work was open without a release; it is placed by what the launch needs.

| Change | Release | Why there |
|---|---|---|
| `deploy-safe-sessions` | R2 | Production deploys several times a day and a retro lasts an hour: the launch cannot drop peer links on every deploy |
| `a11y-gate-and-derived-contrast` | R2 | Launch gate (axe without violation); nightly failed on axe checks |
| `local-data-durability` | R3 | Protects the one copy of a board in the browser; not a launch blocker |
| `portable-relay-core` | R3 | Delivered and archived (1.53.0 to 1.55.0): runtime-neutral relay core, thin Durable Object adapter and a Node adapter for the self-host container |

The follow-ups named in the `portable-relay-core` proposal (`rtc-config-and-deploy-targets`, `selfhost-container-gate`) are not yet changes of their own.
