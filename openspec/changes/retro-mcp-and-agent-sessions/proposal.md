# Proposal

## Why

The owner wants agents to take part in retros: add their feedback (for example a CI agent reporting flaky tests, or a coding agent's view of the sprint), help summarise, and do it within a time box. An MCP server makes RetroBoard usable from any MCP client (Claude Code, OpenCode, desktop apps).

## What Changes

- `@retroboard/mcp`: a local stdio MCP server published on npm; it joins a board with an agent invitation link and holds the key locally, so E2E is preserved.
- Agent invitations created by the facilitator: scopes (read, add ideas, add feedback, vote, propose actions), quotas (max ideas), expiry (time box), signed by the facilitator key.
- Agent participants are labelled (robot badge, agent name) and their ideas go to an "Agents" lane or are marked, collapsible, excluded from voting unless allowed.
- Tools: `get_board`, `list_ideas`, `add_idea`, `add_feedback`, `vote`, `list_actions`, `propose_action`, `summarise`; resources: board snapshot, agenda, report.
- Session ends automatically at expiry; facilitator can revoke at any time.

Out of scope: hosted/remote MCP (would need plaintext on our side).

## Capabilities

### New Capabilities

- `agent-access`: how agents join, what they may do and how their sessions are time-boxed.

### Modified Capabilities

None.

## Impact

- New `apps/mcp` package (Node 22+), shared `packages/application`, `protocol`, `sync`, `crypto`.
- Free-plan budget: agents count as participants; quotas cap their events.
