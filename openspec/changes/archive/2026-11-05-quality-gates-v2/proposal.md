# Proposal

## Why

Owner feedback (2026-10-29): add Lighthouse testing through the existing Playwright setup and use it, with contrast reports, to keep every theme accessible in light and dark. Also, main went red on 2026-10-26 because the local checks before pushing did not include the bundle budget; the local gate must match CI.

## What Changes

- `pnpm prepush`: verify, bundle budget, generate and the core e2e gate, documented in AGENTS.md as the local gate.
- Lighthouse through Playwright on landing, new board, board and report, light and dark, with budgets for performance, accessibility and best practices; reports as artifacts.
- Contrast run on every theme and variant (axe color-contrast on the main screens) with a published table.
- sync-issues closes the issues of finished task groups and epics.
- Moved here from agentic-delivery-harness 2.3: the Lighthouse CI part.

Out of scope: visual regression (agentic-delivery-harness 2.2), toolchain speed (ci-toolchain-speed).

Bounded contexts: Platform (CI). Workflow edits need an explicit maintainer request (AGENTS.md).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-security`

## Impact

- Scripts, CI jobs (with maintainer approval), docs.
