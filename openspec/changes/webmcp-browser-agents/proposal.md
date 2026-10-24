# Proposal

## Why

Browsers are starting to expose web pages to AI agents through WebMCP: a page registers tools (name, description, JSON Schema input, an execute function) on `document.modelContext` (previously `navigator.modelContext`), and the browser's agent calls them with the user's session. Chrome runs an origin trial and Edge has experimental support (status July 2026). RetroBoard is a good fit: an agent in the user's browser can summarise a retro, prepare drafts, propose actions, and every call runs locally with the user's key, so end-to-end encryption is preserved up to the agent the user chose. Being ready early is a differentiator.

## What Changes

- A WebMCP adapter in the web app: feature detection (`document.modelContext ?? navigator.modelContext`), tool registration with cleanup when the page or board changes, tolerant of API changes while the spec is a draft.
- Tools on the board page: read the board summary, list ideas and clusters, list actions, read the agenda and timer, write a private draft, propose an action, export Markdown; publishing drafts, voting and creating actions require an explicit human confirmation.
- Tools on the landing and creation pages: list retro formats, suggest a format, prepare a new board (human confirms creation).
- Opt-in: per participant setting (off by default) because the browser's agent may send board content to a remote model; per board policy set by the facilitator ("browser agents allowed").
- Agent actions are labelled in the activity and respect roles, phases and vote limits exactly like human actions.
- Optional lazy-loaded polyfill (`@mcp-b/global`, MIT) when the browser has no native API and the user enabled the setting.

Out of scope: a remote MCP endpoint (see `retro-mcp-and-agent-sessions` for the local MCP server), declarative form annotations (spec section still TODO).

## Capabilities

### New Capabilities

- `browser-agent-tools`: tools RetroBoard exposes to agents running in the user's browser, their consent model and guarantees.

### Modified Capabilities

None.

## Impact

- Contexts: all read models; use cases from `packages/application` (no new domain rules).
- Web adapter `apps/web/app/adapters/webmcp`, profile setting, board policy event (facilitation).
- Free-plan budget: none (tools call the same use cases as the UI).
