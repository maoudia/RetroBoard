# Proposal

## Why

Owner feedback (2026-10-29): with WebMCP support, agents should be first-class citizens: an agent profile is flagged so humans know they are talking to an agent, and agents know which authors are human. The landing page should say the product is agent friendly.

## What Changes

- Participant kind (human or agent) in presence and signed authorship; WebMCP tool sessions set it.
- Robot badge and "Agent" label in participants, notes and actions.
- Tool outputs mark human and agent authors.
- Landing section "Agent friendly" (WebMCP now, MCP server later, export bundle).

Out of scope: MCP invitations, quotas and the agents lane (retro-mcp-and-agent-sessions).

Bounded contexts: Presence, Access (authorship), Companion. No relay traffic change.

## Capabilities

### New Capabilities

- `agents`

### Modified Capabilities

None.

## Impact

- Domain: participant kind; web badges; WebMCP tools; landing section; docs/webmcp.md.
