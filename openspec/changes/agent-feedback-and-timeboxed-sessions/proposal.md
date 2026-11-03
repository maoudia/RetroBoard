# Proposal

## Why
Owner feedback 2026-11-03: help agents add their feedback to a retro, run agentic sessions that are time-boxed, and expose the retro through an MCP. The MCP server and agent participants are already specified in `retro-mcp-and-agent-sessions`, `agents-first-class` and `webmcp-browser-agents`; this change adds what is missing on top and must be sequenced after them.

## What Changes
- Agent feedback: an agent contributes ideas through a dedicated tool that stamps them as agent-authored, in a clearly labelled agent column or tag, rate limited, and reviewable by the facilitator before becoming visible (default: pending).
- Time-boxed agentic session: a facilitator starts an "agent session" with a duration (for example 10 minutes); agents may write only during it; at the end the grant expires and the session closes automatically.
- MCP coverage: confirm the tool set of `retro-mcp-and-agent-sessions` covers list board, add idea, group, vote (scoped), read results; gaps become tasks there.

## Capabilities
### New Capabilities
- `agent-sessions`: agent feedback and time-boxed sessions.
### Modified Capabilities
<!-- none -->

## Impact
Protocol grant with expiry, domain rule for agent-authored events, facilitator review UI, MCP tools. Untrusted-content wrapping stays mandatory. No server storage. Spec only for now.
