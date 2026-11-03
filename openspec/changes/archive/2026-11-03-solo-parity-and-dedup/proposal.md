# Proposal

## Why

Owner feedback (2026-11-02): "Try solo" still runs the old engine and shows none of the recent features; every feature must reach every page, and the code base must have no duplicated paths, following clean code and clean architecture.

Root cause found in the code: solo boards use `LoopbackTransport`, which folds the legacy reducer (`reduce` of the old board model), while shared boards run the signed event ledger through `EncryptedRelayTransport`. Two engines mean two sets of features. Landing and creation pages also each build a solo board with a hard-coded template and theme.

## What Changes

- Solo boards run the same ledger engine as shared boards with an in-memory relay port (nothing leaves the tab), so agenda, clusters, roles, actions, presenter and every later feature work in solo with no extra code.
- "Try solo" opens the regular creation flow with solo preselected (format, theme, simple and advanced modes), not a fixed board.
- The legacy reducer path is removed once unused (code, tests, docs), per the superseded-features rule.
- A parity test lists the board features (toolbar actions, dialogs, panels) and checks each is present in solo and shared boards.
- A duplication gate (jscpd, MIT licence) runs in `pnpm verify` with a low threshold; current duplicates are refactored into shared components or use cases.

Out of scope: offline sync of a solo board to a shared one (a later "share this solo board" change).

Bounded contexts: Sync (transport port), all contexts benefit. ADR needed: one engine for solo and shared boards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`: solo boards use the same engine and features as shared boards.

## Impact

- Web: transport factory, landing and creation pages, removal of `LoopbackTransport` and the legacy reducer usage.
- Packages: domain legacy reducer removed if nothing else uses it.
- Quality: jscpd in verify (dev dependency, MIT, checked size).
