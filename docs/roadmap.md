# Roadmap

The roadmap lives in GitHub: release milestones in the repository and the organisation project
[RetroBoard roadmap](https://github.com/orgs/maoudia/projects/7). Each OpenSpec change is one epic issue in one
release; each task group of a change is one sub-issue (one pull request). Target dates are planning targets,
reviewed at each release.

Priority (owner rule, 2026-10-29): bugs first (`priority:1-urgent`, standalone `bug` issues), then the design value
users see first (`priority:2-design`), then CI/CD quality (`priority:3-quality`), then the rest (`priority:4-later`).
Within a release, take the lowest priority number first.

Source of truth: `scripts/github/sync-issues.mjs` (`ROADMAP` and `RELEASES`). Run it with `--apply` after
adding or re-planning a change; the `Project roadmap` workflow then puts the issues on the project.

## R1 Beta ready (target 2026-11-15)

Recalibrated 2026-11-02 (owner feedback wave P10): the beta closes on what a real team needs first. Order of work: `reliable-board-sync` (last task), `password-by-default`, `ui-coherence-pass`, `mode-parity`, `community-feedback`. Delivered in R1 and waiting for archive: service pages, facilitation defaults, sticky notes v2, board lifecycle, keyboard, phase cues, name nudge, author name, draft-first composer, self rename.

* `reliable-board-sync` ([proposal](../openspec/changes/reliable-board-sync/proposal.md))
* `password-by-default` ([proposal](../openspec/changes/archive/2026-11-03-password-by-default/proposal.md))
* `ui-coherence-pass` ([proposal](../openspec/changes/archive/2026-11-03-ui-coherence-pass/proposal.md))
* `mode-parity` ([proposal](../openspec/changes/archive/2026-11-03-mode-parity/proposal.md))
* `community-feedback` ([proposal](../openspec/changes/community-feedback/proposal.md))
* `ux-irritants-wave-3` ([proposal](../openspec/changes/archive/2026-11-03-ux-irritants-wave-3/proposal.md)) - live retro 2026-11-03: calm UI, menus, column turns, global timer cap
* `feedback-wave-4` ([proposal](../openspec/changes/feedback-wave-4/proposal.md)) - owner feedback 2026-11-03, ten screenshots: chat, dialogs, buttons, hide for now, writing-area sizing, floor banner, voting menu, peer colours, shield. NEXT RELEASE
* `mobile-board-space` ([proposal](../openspec/changes/archive/2026-11-03-mobile-board-space/proposal.md)) - live retro 2026-11-02: room to work on phones
* `edit-published-notes` ([proposal](../openspec/changes/archive/2026-11-03-edit-published-notes/proposal.md)) - live retro 2026-11-02
* `ux-irritants-wave-2` ([proposal](../openspec/changes/archive/2026-11-03-ux-irritants-wave-2/proposal.md)) - live retro 2026-11-02, phone: UX irritants first, before any new feature

## R2 Facilitation and visuals (target 2026-12-06)

Added 2026-11-02 after a live retro: `board-layout-v2` (hide and resize the writing area, drag column widths, shared board display) and `presenter-accordion-motion`.

* `board-layout-v2` ([proposal](../openspec/changes/archive/2026-11-03-board-layout-v2/proposal.md))
* `presenter-accordion-motion` ([proposal](../openspec/changes/archive/2026-11-03-presenter-accordion-motion/proposal.md))

Quality items that do not block the beta moved here from R1 (`ci-toolchain-speed`, `edge-security-and-domain`, `p2p-presence-and-cursors`, `automated-semver-release`). New from P10: per-device layouts, solo parity with one engine, results insights; `short-links-and-join` now carries the short join code.

* `device-layout-prefs` ([proposal](../openspec/changes/device-layout-prefs/proposal.md))
* `solo-parity-and-dedup` ([proposal](../openspec/changes/archive/2026-11-03-solo-parity-and-dedup/proposal.md))
* `results-insights` ([proposal](../openspec/changes/results-insights/proposal.md))
* `short-links-and-join` ([proposal](../openspec/changes/short-links-and-join/proposal.md))
* `presenter-mode-v2` ([proposal](../openspec/changes/presenter-mode-v2/proposal.md))
* `composer-and-colour-v3` ([proposal](../openspec/changes/composer-and-colour-v3/proposal.md))
* `activity-rings-timer` ([proposal](../openspec/changes/activity-rings-timer/proposal.md))
* `cluster-reveal-motion` ([proposal](../openspec/changes/cluster-reveal-motion/proposal.md))
* `voting-results-charts` ([proposal](../openspec/changes/archive/2026-11-03-voting-results-charts/proposal.md))
* `voting-v2-and-ranking` ([proposal](../openspec/changes/voting-v2-and-ranking/proposal.md))
* `postit-visual-system` ([proposal](../openspec/changes/postit-visual-system/proposal.md))
* `publishing-ux-redesign` ([proposal](../openspec/changes/publishing-ux-redesign/proposal.md))
* `responsive-and-i18n-hardening` ([proposal](../openspec/changes/responsive-and-i18n-hardening/proposal.md))
* `export-hub` ([proposal](../openspec/changes/export-hub/proposal.md))
* `retro-report` ([proposal](../openspec/changes/retro-report/proposal.md))
* `facilitator-moderation` ([proposal](../openspec/changes/facilitator-moderation/proposal.md))
* `board-creation-v2` ([proposal](../openspec/changes/board-creation-v2/proposal.md))
* `ci-toolchain-speed` ([proposal](../openspec/changes/ci-toolchain-speed/proposal.md))
* `edge-security-and-domain` ([proposal](../openspec/changes/edge-security-and-domain/proposal.md))
* `p2p-presence-and-cursors` ([proposal](../openspec/changes/p2p-presence-and-cursors/proposal.md))
* `automated-semver-release` ([proposal](../openspec/changes/automated-semver-release/proposal.md))
* `quality-gates-v2` ([proposal](../openspec/changes/quality-gates-v2/proposal.md))
* `allure-report-aggregation` ([proposal](../openspec/changes/allure-report-aggregation/proposal.md))

## R3 Teams and themes (target 2027-01-10)

* `board-chat` ([proposal](../openspec/changes/archive/2026-11-03-board-chat/proposal.md)) - added 2026-11-02 after a live retro

`team-workspaces` (teams, projects, carry-over by team) leads; it folds the team part of `profile-avatars-and-team-space` and the team source of `actions-v2-and-carry-over`. The component library (`design-system-components`) follows the CSS coherence pass of R1.

* `team-workspaces` ([proposal](../openspec/changes/team-workspaces/proposal.md))
* `profile-avatars-and-team-space` ([proposal](../openspec/changes/profile-avatars-and-team-space/proposal.md))
* `actions-v2-and-carry-over` ([proposal](../openspec/changes/actions-v2-and-carry-over/proposal.md))
* `design-system-components` ([proposal](../openspec/changes/design-system-components/proposal.md))
* `calendar-agenda-import` ([proposal](../openspec/changes/calendar-agenda-import/proposal.md))
* `themes-pop-culture` ([proposal](../openspec/changes/themes-pop-culture/proposal.md))
* `talk-time-v2` ([proposal](../openspec/changes/talk-time-v2/proposal.md))
* `up-down-votes` ([proposal](../openspec/changes/up-down-votes/proposal.md))
* `vote-all-on-one-idea` ([proposal](../openspec/changes/vote-all-on-one-idea/proposal.md)) - spec only, 2026-11-03
* `board-undo-rewind` ([proposal](../openspec/changes/board-undo-rewind/proposal.md)) - spec only, 2026-11-03
* `export-destinations-v2` ([proposal](../openspec/changes/export-destinations-v2/proposal.md)) - GitHub/GitLab, backup, SQLite, settings; spec only
* `user-drive-storage` ([proposal](../openspec/changes/user-drive-storage/proposal.md)) - encrypted opt-in storage on the user's drives; spec only, key for adoption
* `user-manual-and-tutorials` ([proposal](../openspec/changes/user-manual-and-tutorials/proposal.md)) - spec only
* `agents-first-class` ([proposal](../openspec/changes/agents-first-class/proposal.md))
* `agentic-delivery-harness` ([proposal](../openspec/changes/agentic-delivery-harness/proposal.md))
* `webmcp-browser-agents` ([proposal](../openspec/changes/webmcp-browser-agents/proposal.md))

## R4 Agents and growth (target 2027-02-14)

Unchanged scope, dates shifted with R3.

* `retro-mcp-and-agent-sessions` ([proposal](../openspec/changes/retro-mcp-and-agent-sessions/proposal.md))
* `local-ai-companion` ([proposal](../openspec/changes/local-ai-companion/proposal.md))
* `landing-v2-and-product-video` ([proposal](../openspec/changes/landing-v2-and-product-video/proposal.md))
* `agent-feedback-and-timeboxed-sessions` ([proposal](../openspec/changes/agent-feedback-and-timeboxed-sessions/proposal.md)) - spec only, 2026-11-03
* `funny-local-companion` ([proposal](../openspec/changes/funny-local-companion/proposal.md)) - spec only, 2026-11-03

## Parked

* `licensing-and-monetization` ([proposal](../openspec/changes/licensing-and-monetization/proposal.md))

## Project setup (once, in the GitHub UI)

The API cannot create project views, so these three are made by hand once:

1. Add the secret `PROJECT_TOKEN` to the repository (Settings > Secrets and variables > Actions): a classic token with the `project` and `repo` scopes, or a fine-grained token of the organisation with Projects read and write and Issues read. Then run the `Project roadmap` workflow (Actions > Project roadmap > Run workflow). It creates the fields Release, Target, Kind and Lane and adds every epic and task-group issue.
2. View "Roadmap": layout Roadmap, date field Target, group by Release, filter `kind:Epic is:open`, sort by Lane.
3. View "Board": layout Board, column field Status, group by Release (swimlanes), filter `is:open`.
4. View "Ready for agents": layout Table, filter `label:agent:ready is:open`, group by Release.

Labels: `epic`, `task-group`, `agent:ready` (dependencies done), `blocked`, `lane:A|B|C` (parallel lanes), `phase:P0..P8` (history of the original plan and the owner feedback waves), `priority:1..4`.
