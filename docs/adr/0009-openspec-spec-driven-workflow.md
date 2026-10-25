---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# OpenSpec spec-driven workflow

## Context and Problem Statement

Coding agents (Claude Code, OpenCode) and humans need a shared contract for each change.

## Considered Options

* OpenSpec changes (proposal, specs, design, tasks)
* Free-form issues

## Decision Outcome

Chosen option: "OpenSpec changes (proposal, specs, design, tasks)", because specs are the contract agents implement and reviewers check.

### Consequences

* Good, because every feature has requirements with scenarios and verifiable tasks
* Bad, because specs must be kept in sync and archived
