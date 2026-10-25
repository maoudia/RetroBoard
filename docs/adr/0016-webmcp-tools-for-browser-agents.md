---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# WebMCP tools for browser agents

## Context and Problem Statement

Agents built into browsers can call tools exposed by pages (WebMCP draft, Chrome origin trial, Edge behind a flag in July 2026).

## Considered Options

* Expose WebMCP tools, opt-in per participant, facilitator kill switch, human confirmation for shared writes
* Ignore until the spec is final

## Decision Outcome

Chosen option: "Expose WebMCP tools, opt-in per participant, facilitator kill switch, human confirmation for shared writes", because tools reuse the application use cases, so being early costs little.

### Consequences

* Good, because agents work through the same rules as people
* Bad, because a draft specification may change

## More Information

docs/webmcp.md.
