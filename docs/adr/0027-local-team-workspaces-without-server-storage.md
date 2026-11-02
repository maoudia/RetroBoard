---
status: accepted
date: 2026-11-02
decision-makers: Moncef Aoudia
---

# Local team workspaces without server storage

## Context and Problem Statement

Carrying over the actions of previous retros used one profile per device, so a facilitator of several teams or projects saw every action mixed together. How do we give teams and projects a clean identity while keeping zero server storage? Change: `team-workspaces`.

## Decision Drivers

* No server-side storage and no account (hard constraints).
* A facilitator with five teams must find the right previous actions without effort.
* Simple mode stays simple: the last team is reused silently.

## Considered Options

* One profile per device (status quo)
* Free-text team label on each board
* A local workspace of teams and projects, each saved retro keyed by team and project

## Decision Outcome

Chosen option: "A local workspace of teams and projects", because it separates histories without any server.

* A team has a random id, a name, an emoji and a colour; a project is a free-text stream inside a team. Both live in `localStorage` (`retroboard:workspace`), on this device only.
* Every board created here is assigned a team and optionally a project (`boards` map by room id); simple mode reuses the last team and creates a default one on first use.
* "Save actions for next time" files the actions under the board's team; the carry-over picker lists the open actions of that team (and project) only, newest retro first, with source title and date.
* The single profile of earlier versions (`retroboard:team`) becomes the first team, once.
* Sharing a team between devices (encrypted link or `.retroteam` file with no board content) is a later task of the same change.

### Consequences

* Good, because histories never mix and the model feeds later trends.
* Bad, because a workspace does not follow the person to another device until the sharing task lands.

## More Information

* Complements ADR-0026 and the device-local data rules in `docs/PLAN.md`.
