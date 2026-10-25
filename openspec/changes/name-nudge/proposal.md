# Proposal

## Why

Owner feedback (2026-10-25): many participants keep the default anonymous identity because nothing invites them to pick a name, so the board is full of "Anonymous" notes and owners are hard to assign. A gentle, dismissible floating popup should suggest it.

## What Changes

- A participant with no name sees, a few seconds after joining a board (or right after publishing their first note, whichever comes first), a floating popup: "Add your name so others know who wrote what", with "Choose a name" (opens the name dialog) and "Not now".
- "Not now" hides it for this board; "Don't ask again" (secondary link) hides it on every board of this browser (local profile).
- Never shown to someone who chose to hide their name on purpose (the "show my name" option off), in presenter mode, or during a talk turn popup or a phase-end popup (one popup at a time).
- The popup does not steal focus; it is reachable by keyboard and announced politely.

Out of scope: avatars and Gravatar (profile-avatars-and-team-space).

Bounded contexts: Profile (local). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile`: name nudge.

## Impact

- Web: `NameNudge` floating popup on top of the toast host, local flags in the profile store (`nudgeDismissed`, per-board set in memory), queue rule shared with other popups.
