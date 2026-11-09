# Roadmap

The roadmap lives in GitHub: release milestones in the repository and the organisation project
[RetroBoard roadmap](https://github.com/orgs/maoudia/projects/7). Each OpenSpec change is one epic issue in one
release; each task group of a change is one sub-issue (one pull request). Target dates are planning targets,
reviewed at each release. Plan of 2026-11-04: stabilise first, launch in December, then teams, revenue and agents.

Priority (owner rule, 2026-10-29): bugs first (`priority:1-urgent`, standalone `bug` issues), then the design value
users see first (`priority:2-design`), then CI/CD quality (`priority:3-quality`), then the rest (`priority:4-later`).
Within a release, take the lowest priority number first. At most 3 changes are in progress at once.

Source of truth: `scripts/github/sync-issues.mjs` (`RELEASES`, `ROADMAP`, `PRIORITY`, `GROUP_OVERRIDES`). Run it with `--apply` after
adding or re-planning a change; the `Project roadmap` workflow then puts the issues on the project.

## R1 Stabilisation (target 2026-11-15)

Feature freeze until main is green. Gate: 7 green nightly runs in a row, at most 3 changes in progress, finish `reliable-board-sync`, `community-feedback` and `quality-gates-v2`, landing truth fixes.

* `reliable-board-sync` ([proposal](../openspec/changes/reliable-board-sync/proposal.md))
* `community-feedback` ([proposal](../openspec/changes/community-feedback/proposal.md))
* `quality-gates-v2` ([proposal](../openspec/changes/quality-gates-v2/proposal.md))
* `history-panel-phone-layout` ([proposal](../openspec/changes/history-panel-phone-layout/proposal.md))
* `solo-board-parity` ([proposal](../openspec/changes/solo-board-parity/proposal.md))
* Epic #443 `stabilise-main`: roadmap source of truth, WIP limit, landing truth and favicon, phone UX and docs truth pass are delivered; the trademark check is the owner's task. Hotfix waves are archived as soon as they are merged (last: `2026-11-05-hotfix-ux-wave8`).

## R2 Public launch (target 2026-12-13)

Brand identity, landing v2, user manual, short links, report and insights, code health, CLA, launch kit. Gate: 14 green nightly runs, CLA live, Lighthouse mobile above 95. Anything not on the launch path slips to R3.

* `landing-v2-and-product-video` ([proposal](../openspec/changes/landing-v2-and-product-video/proposal.md))
* `user-manual-and-tutorials` ([proposal](../openspec/changes/user-manual-and-tutorials/proposal.md))
* `short-links-and-join` ([proposal](../openspec/changes/short-links-and-join/proposal.md))
* `retro-report` ([proposal](../openspec/changes/retro-report/proposal.md))
* `results-insights` ([proposal](../openspec/changes/results-insights/proposal.md))
* `design-system-components` ([proposal](../openspec/changes/design-system-components/proposal.md))
* `responsive-and-i18n-hardening` ([proposal](../openspec/changes/responsive-and-i18n-hardening/proposal.md))
* `voting-v2-and-ranking` ([proposal](../openspec/changes/voting-v2-and-ranking/proposal.md))
* `activity-rings-timer` ([proposal](../openspec/changes/activity-rings-timer/proposal.md))
* `p2p-presence-and-cursors` ([proposal](../openspec/changes/p2p-presence-and-cursors/proposal.md))
* `webmcp-browser-agents` ([proposal](../openspec/changes/webmcp-browser-agents/proposal.md))
* `allure-report-aggregation` ([proposal](../openspec/changes/allure-report-aggregation/proposal.md))
* `automated-semver-release` ([proposal](../openspec/changes/automated-semver-release/proposal.md))
* `ci-toolchain-speed` ([proposal](../openspec/changes/ci-toolchain-speed/proposal.md))
* `edge-security-and-domain` ([proposal](../openspec/changes/edge-security-and-domain/proposal.md))
* `agentic-delivery-harness` ([proposal](../openspec/changes/agentic-delivery-harness/proposal.md))
* `note-edit-and-unpublish` ([proposal](../openspec/changes/note-edit-and-unpublish/proposal.md))
* `note-zoom-on-double-tap` ([proposal](../openspec/changes/note-zoom-on-double-tap/proposal.md))
* `group-colors-menu-and-scope` ([proposal](../openspec/changes/group-colors-menu-and-scope/proposal.md))
* `column-defaults-and-collapse` ([proposal](../openspec/changes/column-defaults-and-collapse/proposal.md))
* `chat-floating-dock` ([proposal](../openspec/changes/chat-floating-dock/proposal.md))
* `chat-message-controls` ([proposal](../openspec/changes/chat-message-controls/proposal.md))
* `phase-transition-guidance` ([proposal](../openspec/changes/phase-transition-guidance/proposal.md))
* `simple-mode-ux-pass` ([proposal](../openspec/changes/simple-mode-ux-pass/proposal.md))
* `brand-identity` (change to open: `/opsx:propose`)
* `code-health-for-agents` (change to open: `/opsx:propose`)
* `public-launch` (change to open: `/opsx:propose`)

## R3 Teams and action follow-up (target 2027-01-31)

Team workspaces, carried-over actions, undo history, exports, UI polish. Gate: actions are taken over from one retro to the next.

* `attention-and-notifications` ([proposal](../openspec/changes/attention-and-notifications/proposal.md))
* `team-workspaces` ([proposal](../openspec/changes/team-workspaces/proposal.md))
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
