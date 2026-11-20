# Tasks

## 1. Findings and parsers

- [ ] 1.1 Spike, written up in the pull request: what a browser page can and cannot do against Jira Cloud today (CORS with an API token, the 3LO route and whether the code exchange can be done without a secret, PKCE support), what a Jira list copy puts on the clipboard (HTML and text), and what a "current fields" CSV looks like with the estimate field under its several names; decide whether tier 4 (direct read and write-back) is feasible without a secret of ours or a new origin and, if a new origin is needed, write the ADR with `pnpm adr:new`; verify the findings are linked to sources and fixtures with invented content are committed
- [ ] 1.2 Pure parsers in `packages/exporters`: Jira CSV (quoting, multi-line cells, BOM, delimiters, the estimate field mapping), rich-clipboard table and tab-separated text, key and link extraction; stories with key, title, type, existing estimate and link; verify unit tests on the fixtures, hostile input (formulas, huge cells, 10,000 rows with a cap, invalid UTF-8) and that nothing is evaluated or fetched

## 2. Into the room

- [ ] 2.1 Import dialog in the room: paste, drop a file or choose one, preview with row errors and a mapping step for the estimate field remembered per room, idempotent by key, a cap with a clear message; verify e2e with each fixture, a repeat import that updates instead of duplicating, and axe
- [ ] 2.2 Deck proposal from the existing estimates (Fibonacci, modified Fibonacci, T-shirt or a custom deck for values that fit no preset); verify unit tests of the proposal on the fixtures
- [ ] 2.3 Jira link kept in the encrypted room, each story's key as a link that opens in a new tab with `rel="noopener noreferrer"`, only `https` links to the site the person gave; verify unit tests that other schemes and other hosts are refused and an e2e

## 3. Back to Jira

- [ ] 3.1 "Copy for Jira": a rich clipboard table and a CSV keyed by issue key with the estimate in the mapped field name, through the shared export action of `export-consolidation`; verify exporter snapshot tests, and that the CSV re-imports through the parsers of 1.2 unchanged

## 4. Guide

- [ ] 4.1 Guide chapter "Estimate your Jira stories" (fr and en) with the two-minute path (copy from Jira, paste, vote, copy back), manifest updated, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`

## 5. Direct read and write-back (only if 1.1 says it is possible)

- [ ] 5.1 Decide with the owner from the spike and, if go, specify the flow in a design note and a spec delta before any code; verify `openspec validate jira-estimation-import --strict`. This group is deliberately a decision, not an implementation, and is closed with "not pursued" if the spike finds that a secret or an origin of ours is required
