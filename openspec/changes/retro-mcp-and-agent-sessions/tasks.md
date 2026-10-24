# Tasks

## 1. Domain

- [ ] 1.1 Agent invitation token, scopes, quotas, expiry and revocation in the fold; verify unit tests (expired, over quota, revoked, out of scope)

## 2. Web

- [ ] 2.1 Agent invitation dialog for facilitators (scopes, quota, expiry, copy link, warnings, fr/en); verify e2e
- [ ] 2.2 Agents lane and robot badges, collapse, vote rules; verify e2e with a scripted agent client

## 3. MCP server

- [ ] 3.1 Scaffold `apps/mcp` with MCP SDK stdio, join via invitation link, resync; verify an integration test joining a `wrangler dev` board
- [ ] 3.2 Implement tools and resources with input schemas and untrusted-content wrapping; verify integration tests per tool
- [ ] 3.3 README with Claude Code and OpenCode configuration snippets; publish workflow with provenance; verify `npx @retroboard/mcp --help` from a packed tarball
