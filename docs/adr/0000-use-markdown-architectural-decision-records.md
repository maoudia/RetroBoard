---
status: accepted
date: 2026-10-25
decision-makers: Moncef Aoudia
---

# Use Markdown Architectural Decision Records

## Context and Problem Statement

Decisions were kept as one table in docs/PLAN.md section 2. The table had no dates, no status, and no way to say that a later decision replaced an earlier one (several did: the relay design, Turnstile). Which format should decisions follow so that people and coding agents can read, write and check them?

## Decision Drivers

* Lean: a decision fits on one screen
* Checkable in CI without heavy tooling
* Well known outside this project

## Considered Options

* MADR 4.0, lean variant (front matter, context, options, outcome, consequences), checked by a small script and markdownlint
* Michael Nygard's original template
* log4brains (MADR plus a static site generator)
* adr-tools (shell scripts)
* Keep the table in docs/PLAN.md

## Decision Outcome

Chosen option: "MADR 4.0, lean variant", because it is the most widely used Markdown ADR format, it states the options that were rejected, and its fields (status, date, decision-makers) are easy to validate with a 150-line script. log4brains and adr-tools add a toolchain for features we do not need; the Nygard template has no "considered options".

### Consequences

* Good, because every decision has a status, a date and its rejected alternatives
* Good, because CI rejects malformed ADRs, gaps in numbering, broken supersession links and a stale index
* Bad, because the history of the old table is migrated by hand (ADR-0001 to ADR-0016 keep their original numbers)

## More Information

* MADR: <https://adr.github.io/madr/> (template package `madr` 4.0.0 on npm, MIT or CC0)
* Nygard: <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>
* Tooling: `pnpm adr:new`, `pnpm adr:index`, `pnpm adr:check` (scripts/adr), markdownlint-cli2, workflow `.github/workflows/adr.yml`
