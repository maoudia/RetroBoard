# Design

## Decisions

- `apps/mcp` uses the official MCP TypeScript SDK (stdio transport), Node 22 WebSocket client, and the same `application`, `sync`, `crypto`, `protocol` packages as the web app (the reason for the monorepo).
- Invitation link `#k=<roomKey>&a=<agentToken>`; `agentToken` = facilitator-signed `{ agentKeyPub, name, scopes, maxIdeas, exp }` plus the agent private key, generated in the facilitator's browser.
- Peers validate agent events against the token (scope, quota, expiry) in the fold.
- Tool outputs are compact Markdown or JSON; `summarise` returns structured data, the client's model writes prose.
- Published with npm provenance from CI on release tags.

Security and privacy note: whoever holds the agent link can read the board; the invitation dialog says so and defaults to a 30-minute expiry.

## Risks / Trade-offs

- [Prompt injection through ideas read by agents] -> tool descriptions warn that board content is untrusted user data; `get_board` wraps content in clearly delimited fields.
- [Agent spam] -> quotas and per-key rate limits in the fold.
