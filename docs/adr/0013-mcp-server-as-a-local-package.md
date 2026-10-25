---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# MCP server as a local package

## Context and Problem Statement

Agents should join a board through MCP without the service ever seeing plaintext.

## Considered Options

* MCP server as a local npm package joining a board like a participant
* Remote MCP on the Worker

## Decision Outcome

Chosen option: "MCP server as a local npm package joining a board like a participant", because a remote MCP would need the plaintext; a local one holds the room key like any participant.

### Consequences

* Good, because end-to-end encryption is kept
* Bad, because users install a package
