# Roadmap

The roadmap lives in GitHub: release milestones in the repository and the organisation project
[RetroBoard roadmap](https://github.com/orgs/maoudia/projects/7). Each OpenSpec change is one epic issue in one
release; each task group of a change is one sub-issue (one pull request). Target dates are planning targets,
reviewed at each release.

Source of truth: `scripts/github/sync-issues.mjs` (`ROADMAP` and `RELEASES`). Run it with `--apply` after
adding or re-planning a change; the `Project roadmap` workflow then puts the issues on the project.

## R1 Beta ready (target 2026-11-08)

* `service-pages` ([proposal](../openspec/changes/service-pages/proposal.md))
* `single-facilitator` ([proposal](../openspec/changes/single-facilitator/proposal.md))
* `sticky-notes-v2` ([proposal](../openspec/changes/sticky-notes-v2/proposal.md))
* `board-lifecycle` ([proposal](../openspec/changes/board-lifecycle/proposal.md))
* `edge-security-and-domain` ([proposal](../openspec/changes/edge-security-and-domain/proposal.md))
* `p2p-presence-and-cursors` ([proposal](../openspec/changes/p2p-presence-and-cursors/proposal.md))
* `keyboard-shortcuts` ([proposal](../openspec/changes/keyboard-shortcuts/proposal.md))
* `ci-toolchain-speed` ([proposal](../openspec/changes/ci-toolchain-speed/proposal.md))

## R2 Facilitation and visuals (target 2026-11-29)

* `facilitator-moderation` ([proposal](../openspec/changes/facilitator-moderation/proposal.md))
* `activity-rings-timer` ([proposal](../openspec/changes/activity-rings-timer/proposal.md))
* `cluster-reveal-motion` ([proposal](../openspec/changes/cluster-reveal-motion/proposal.md))
* `voting-results-charts` ([proposal](../openspec/changes/voting-results-charts/proposal.md))
* `voting-v2-and-ranking` ([proposal](../openspec/changes/voting-v2-and-ranking/proposal.md))
* `publishing-ux-redesign` ([proposal](../openspec/changes/publishing-ux-redesign/proposal.md))
* `postit-visual-system` ([proposal](../openspec/changes/postit-visual-system/proposal.md))
* `responsive-and-i18n-hardening` ([proposal](../openspec/changes/responsive-and-i18n-hardening/proposal.md))
* `profile-avatars-and-team-space` ([proposal](../openspec/changes/profile-avatars-and-team-space/proposal.md))
* `export-hub` ([proposal](../openspec/changes/export-hub/proposal.md))
* `retro-report` ([proposal](../openspec/changes/retro-report/proposal.md))

## R3 Teams and themes (target 2026-12-20)

* `calendar-agenda-import` ([proposal](../openspec/changes/calendar-agenda-import/proposal.md))
* `themes-pop-culture` ([proposal](../openspec/changes/themes-pop-culture/proposal.md))
* `board-creation-v2` ([proposal](../openspec/changes/board-creation-v2/proposal.md))
* `actions-v2-and-carry-over` ([proposal](../openspec/changes/actions-v2-and-carry-over/proposal.md))
* `agentic-delivery-harness` ([proposal](../openspec/changes/agentic-delivery-harness/proposal.md))
* `webmcp-browser-agents` ([proposal](../openspec/changes/webmcp-browser-agents/proposal.md))

## R4 Agents and growth (target 2027-01-31)

* `retro-mcp-and-agent-sessions` ([proposal](../openspec/changes/retro-mcp-and-agent-sessions/proposal.md))
* `local-ai-companion` ([proposal](../openspec/changes/local-ai-companion/proposal.md))
* `landing-v2-and-product-video` ([proposal](../openspec/changes/landing-v2-and-product-video/proposal.md))

## Parked

* `licensing-and-monetization` ([proposal](../openspec/changes/licensing-and-monetization/proposal.md))

## Project setup (once, in the GitHub UI)

The API cannot create project views, so these three are made by hand once:

1. Add the secret `PROJECT_TOKEN` to the repository (Settings > Secrets and variables > Actions): a classic token with the `project` and `repo` scopes, or a fine-grained token of the organisation with Projects read and write and Issues read. Then run the `Project roadmap` workflow (Actions > Project roadmap > Run workflow). It creates the fields Release, Target, Kind and Lane and adds every epic and task-group issue.
2. View "Roadmap": layout Roadmap, date field Target, group by Release, filter `kind:Epic is:open`, sort by Lane.
3. View "Board": layout Board, column field Status, group by Release (swimlanes), filter `is:open`.
4. View "Ready for agents": layout Table, filter `label:agent:ready is:open`, group by Release.

Labels: `epic`, `task-group`, `agent:ready` (dependencies done), `blocked`, `lane:A|B|C` (parallel lanes), `phase:P0..P7` (history of the original plan).
