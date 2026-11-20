# Proposal

## Why

Owner note (2026-11-20): "Team and project at the top of board creation, not the bottom, available in simple and advanced mode."

On `/new` (`apps/web/app/pages/new.vue`) the team card sits after the setup form and after the agenda editor, and it is shown in advanced mode only. Simple mode silently uses the last team (`team.ensureTeam()`). The order is backwards for the people it matters to: the team decides the format, the title series ("Sprint 14"), the theme and the agenda (`team.defaultsOf`, `prefill`), so choosing it last means the form above it has already been filled, and the team's defaults then overwrite or are ignored. In simple mode there is no way to say which team or project a board belongs to, although the carry-over of open actions depends on it.

## What Changes

- **Team and project first.** The team card moves above the setup form on `/new`, directly under the mode switch and the "resume" card. Choosing or creating a team applies its defaults to the form below (format, next title, theme, agenda) as it does today, now before the person has typed anything.
- **In both modes.** Simple mode shows one compact row: the team (a select with "New team") and an optional project; it keeps today's behaviour when the person never touches it (the last team, no project). Advanced mode shows the same row with the longer explanation. Nothing else about simple and advanced changes.
- **Typing is never overwritten.** If the person has already typed a title or picked a format, changing the team proposes its defaults but does not replace those choices (the existing `typed` rule of `BoardSetupForm.vue`).
- **Carry-over follows.** The carry-over picker keeps reading the chosen team and project; it stays advanced-only and below the form.
- **Same on the other set-up surfaces.** The board set-up page and its invite step (`ui-modes`, "Same modes on every set-up surface") apply the same order.

Out of scope: the creation stepper of `board-creation-v2` (it builds on this order), new team fields, team sharing, the project model (a project stays a free-text label of a team).

Bounded contexts: Profile and Team (local workspace), board creation (web). No domain, protocol or relay change; no free-plan impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`: team and project come first in creation, in both modes.
- `team-space`: simple mode can choose a team and a project.

## Impact

- `apps/web/app/pages/new.vue` (section order, a compact simple-mode row), `BoardSetupForm.vue` (prefill timing), the set-up page that shares the form, i18n fr and en, guide step and manifest, e2e specs that assume the old order.
