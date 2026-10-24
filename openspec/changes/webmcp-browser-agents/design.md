# Design

## Context

WebMCP is a draft Community Group spec (W3C Web Machine Learning CG). The July 2026 draft moved the entry point from `navigator.modelContext` to `document.modelContext`; Chrome serves it through an origin trial (Chrome 149-156) and Edge 147 behind a flag. Field names have varied across drafts and articles (`execute` vs `handler`, `provideContext` removed in March 2026), so the adapter must isolate the API. Sources: <https://www.spronta.com/blog/state-of-webmcp-july-2026/>, <https://webmcp-checker.com/blog/navigator-modelcontext-api-reference>, <https://w3c-cg.github.io/aikr/webMCP/webmcp-technical-notes.html>.

## Goals / Non-Goals

**Goals:** ready for the API today, resilient to spec churn, privacy-respecting defaults, zero cost.
**Non-Goals:** shipping the origin trial token on every page before the owner decides; supporting agents outside the browser (local MCP server covers that).

## Decisions

- **Port and adapter**: `BrowserAgentPort { available(): boolean; register(tools): Disposable }` in `packages/application`; adapter `apps/web/app/adapters/webmcp.ts`. Tool definitions are plain data built in `application` (name, title, description, inputSchema, readOnly, needsConfirmation, run) so they are unit-testable without a browser.
- **API shim**: `const mc = document.modelContext ?? navigator.modelContext`. Register with `{ name, description, inputSchema, annotations: { readOnlyHint }, execute }`; unregister through the returned handle when it is a function or has `unregister()`, else `mc.unregisterTool(name)`. One place to update when the spec changes.
- **Confirmation**: use `client.requestUserInteraction()` when the second `execute` argument provides it, else `mc.requestUserInteraction` if present, else our own confirmation dialog. Confirmation shows exactly what will be written.
- **Policy**: participant setting `browserAgents: boolean` (local, default false); board policy `browserAgentsAllowed` (facilitator, signed event, default true) - tools register only when both are true.
- **Polyfill**: `@mcp-b/global` (MIT) lazy-loaded only when the setting is on and no native API exists; check its CSP and network behaviour before enabling (task 1.3).
- **Origin trial token**: delivered as a response header from the Worker (not a meta tag, to keep the CSP static) once the owner registers retroboard.maoudia.com for the trial.
- **Naming**: tool names `retro_get_board`, `retro_list_ideas`, `retro_list_actions`, `retro_get_agenda`, `retro_write_draft`, `retro_publish_drafts`, `retro_vote`, `retro_propose_action`, `retro_export_markdown`, `retro_list_formats`, `retro_suggest_format`, `retro_prepare_board`.

Security and privacy note: tools run in the page with the participant's keys; whatever the browser's agent sends to its model leaves E2E protection by the participant's choice, hence opt-in and a facilitator kill switch.

## Risks / Trade-offs

- [Spec churn] -> single shim, contract tests with a fake model context, nightly check against Chrome Canary when available.
- [Prompt injection through notes] -> delimited data fields, confirmation on every shared write.
- [Agents spamming] -> same rate limits and quotas as humans.
