# Proposal

## Why

Owner note (2026-11-20): "Cursors are a bad idea and work only via worker or LAN P2P; disable the feature for now."

Shared pointers travel only over the direct peer links (ADR-0017: board events and cursors travel peer to peer). A participant on the relay fallback shares no cursors (`presence` spec, "Relay fallback"), and direct links need a network where WebRTC succeeds (the same LAN, or a permissive NAT). On a typical corporate or home network behind NAT the feature works for some people and not others, and nobody can tell why a colleague's pointer is missing. A feature that works for some participants, on some networks, looks like a bug and also adds a "Share my pointer" decision to every profile. The owner wants it off for now.

Disabling must be a switch, not a deletion: the code, the protocol frames and the tests stay so the feature can come back, possibly with the portable relay, without a rewrite.

## What Changes

- **Off by default and not reachable.** A build-time and runtime feature flag `CURSORS_ENABLED` (false) hides every entry point: the "Share my pointer" and "Show others' pointers" settings in Profile, the cursor layer on the board, the laser pointer of presenter mode if it depends on the same frames, and the cursor line of the shortcuts and help. No cursor frame is sent or drawn, even by a client whose stored settings say `shareCursor: true` (the default today).
- **Presence stays.** Participant status, "typing in column 2", avatar markers on column tabs and notes, and the participant list are unchanged: they are not pointers. The touch focus sharing stays.
- **No traffic.** The pointer sampling and the peer-link frames are not sent, so the board gets lighter for everyone, which is the safe direction for the free-plan budget.
- **Settings migration.** Stored `shareCursor` and `showCursors` values are kept (not rewritten) so turning the flag back on restores each person's choice; they are inert while the flag is off, and the synced settings list keeps them.
- **Docs.** The user guide, the shortcuts help, the landing text and the `presence` spec say that shared pointers are paused, not removed. ADR-0017 is not rewritten: board events keep travelling peer to peer, only the pointer frames stop.

Out of scope: removing the code, changing the peer mesh, presence statuses, the presenter spotlight (a presenter-driven view, not a cursor), re-enabling the feature (a later change decides, possibly with a worker relay path).

Bounded contexts: Presence (web and transport). Relay traffic: lower; no protocol change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presence`: live cursors and their controls are paused behind a feature flag.

## Impact

- `apps/web/app/composables/useLiveShare.ts`, `components/CursorLayer.vue`, `stores/live.ts`, `ProfileDialog.vue`, `pages/boards.vue`, the keyboard help, i18n, the user guide chapter and its manifest steps, landing copy.
- Tests: the cursor e2e specs and the presence unit tests are kept and run with the flag on in a dedicated project or env, so the feature does not rot; new e2e proves that with the flag off no cursor is drawn or sent.
