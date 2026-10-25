# Tasks

## 1. Port, shim and polyfill

- [x] 1.1 Define `BrowserAgentPort` and the tool definition type in `packages/application`; verify unit tests with a fake port
- [x] 1.2 Implement the WebMCP adapter shim (document/navigator detection, register/unregister variants, confirmation fallbacks); verify unit tests against fake model contexts shaped like each known draft
- [x] 1.3 Evaluate `@mcp-b/global` (license, size, network, CSP) and lazy-load it behind the setting; verify bundle budget and the CSP e2e guard with the polyfill on

## 2. Consent and policy

- [x] 2.1 Participant setting "Allow AI agents in my browser" with the privacy explanation (fr/en), default off; verify e2e that no tool registers when off
- [x] 2.2 Facilitator board policy "browser agents allowed" (signed event) and live unregistration; verify unit test and e2e with two contexts

## 3. Tools

- [x] 3.1 Read tools (board summary, ideas and clusters, actions, agenda) with untrusted-content wrapping and hidden-count rules; verify unit tests per tool
- [x] 3.2 Write tools (write draft, publish drafts, vote, propose action, export Markdown) through application use cases with confirmations; verify unit tests (limits, roles, declined confirmation) and an e2e with a fake model context injected by Playwright
- [x] 3.3 Setup tools on landing and /new (list formats, suggest format, prepare board); verify e2e that creation needs the human click

## 4. Rollout

- [ ] 4.1 (Implemented: tokens in wrangler vars, header served, unit tested, docs/webmcp.md; pending: owner manual test in Chrome.) Origin trial token served as a Worker response header when configured (env var), documented in docs/webmcp.md with a manual test in Chrome; verify unit test of the header and owner sign-off
