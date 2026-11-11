# Proposal

## Why

Owner feedback (2026-11-02): carrying over the actions of previous retros does not work for someone who facilitates several teams and projects. The product needs a clean notion of team, maybe project and company, so that previous actions, titles, formats and history are found in the right context.

## What Changes

- Local workspaces, no server: Organisation (optional label) > Team > Project (optional stream inside a team). A team has a random id, a name, a colour and an emoji; it lives on the device.
- Every board belongs to a team and optionally a project, chosen at creation (simple mode prefills the last team used; advanced shows team and project).
- Previous actions: the carry-over picker lists the open actions of the previous retros of the same team, filterable by project, with the source board and date; actions of other teams never mix in.
- Team series: smart title, default format, theme and agenda per team ("Sprint 43" follows "Sprint 42" of the same team only).
- Home and profile: a team switcher; recent boards grouped by team; a facilitator with five teams sees five clean lanes.
- Share a team: an encrypted team link or `.retroteam` file carries the team id, name and settings (never board content), so teammates' boards group under the same team; it also moves a workspace to a new device.
- History per team feeds the results trends of `results-insights`.

Out of scope: accounts, a server directory, syncing teams automatically between devices (no server storage).

Folds the team-space part of `profile-avatars-and-team-space` (tasks 2.1 to 2.3, marked moved) and the carry-over sources of `actions-v2-and-carry-over`.

Bounded contexts: Team space (local), Action tracking (carry-over query), Facilitation (creation). ADR needed: local team identity and sharing.

## Capabilities

### New Capabilities

- `team-space`

### Modified Capabilities

None.

## Impact

- Packages: team-space model and use cases in application; IndexedDB adapter in web.
- Web: creation form, carry-over picker, home and profile switcher, team share link and file.
- Docs: ADR, PLAN section 4.
