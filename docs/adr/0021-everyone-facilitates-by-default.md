---
status: accepted
date: 2026-10-25
decision-makers: Moncef Aoudia
---

# Everyone facilitates by default

## Context and Problem Statement

ADR-0005 gave every board a facilitator role, with "facilitation open to everyone" as a hidden option. The owner observed that most teams do not want one person in charge and asked that the creator can choose "no facilitator", with every facilitator feature available to everyone, as the default.

## Decision Drivers

* Most retros are run by peers, not by a dedicated facilitator
* No new role state to replicate and verify (simple, robust)
* The agenda must keep its meaning on an open board

## Considered Options

* Everyone facilitates by default, one facilitator on request, phase rules kept for everyone
* One facilitator by default (today), open facilitation as an option
* Per-feature permissions (who may reveal, who may change the theme, and so on)

## Decision Outcome

Chosen option: "Everyone facilitates by default, one facilitator on request, phase rules kept for everyone", because it matches how teams work, reuses the existing `openFacilitation` setting, and needs no new state. Switching the mode stays reserved to the facilitator capability, so nobody can take control of an open board.

### Consequences

* Good, because joining a board gives full control to the team without any handover
* Good, because single-facilitator rules only apply to boards that asked for a facilitator
* Bad, because any participant can move the phase for everyone; mitigated by a toast naming who did it

## More Information

* Refines ADR-0005 (the facilitator role still exists in "One facilitator" mode).
* OpenSpec change: open-facilitation-default.
