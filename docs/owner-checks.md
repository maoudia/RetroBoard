# Owner checks

Manual checks only the owner can run. They were moved out of their OpenSpec changes so that the changes could be
archived and the work-in-progress count (`pnpm wip`) stays honest. They are **moved, not completed**: nothing here is
ticked until the owner has run the check. Tick a box in the pull request that records the result, and comment on the epic.

Linked from the [roadmap](roadmap.md) (R1 and R2).

## R1

- [ ] `reliable-board-sync` 4.3: Owner field re-test on real devices (different networks, one phone on mobile data); verify owner sign-off comment on the epic issue.
  Epic: [#169](https://github.com/maoudia/RetroBoard/issues/169). Archived change: `openspec/changes/archive/2026-11-12-reliable-board-sync/`.

## R2

- [ ] `p2p-presence-and-cursors` 4.2: Production check of link success rates behind corporate networks (manual, documented in docs/capacity.md).
  Epic: [#35](https://github.com/maoudia/RetroBoard/issues/35). Archived change: `openspec/changes/archive/2026-11-12-p2p-presence-and-cursors/`.
- [ ] `webmcp-browser-agents` 4.1: Origin trial token served as a Worker response header when configured (env var), documented in docs/webmcp.md with a manual test in Chrome; implemented (tokens in wrangler vars, header served, unit tested, docs/webmcp.md), pending the owner manual test in Chrome and sign-off.
  Epic: [#105](https://github.com/maoudia/RetroBoard/issues/105). Archived change: `openspec/changes/archive/2026-11-12-webmcp-browser-agents/`.
