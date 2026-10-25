# Proposal

## Why

Field test by the owner (2026-10-25): many participants typed a name and still published anonymous notes. The cause: "Show my name on the notes I publish" is a separate checkbox, off by default, in the name dialog and the profile. Typing a name looks like enough, so people never tick it. The owner wants the name shown on notes by default, with an easy way to stay anonymous.

## What Changes

- **Name on by default.** When a participant enters a name, "show my name on my notes" defaults to on, in the name dialog and in the profile. Clearing the name turns it off. Unticking it keeps the participant anonymous.
- **The composer shows the signature.** Each composer shows "Signed as Alice" or "Anonymous" next to the buttons, and one click switches between the two. The choice is the profile setting itself (`showName`), so it applies to the following notes, never to notes already published.
- **Existing profiles keep their choice.** A saved profile with `showName: false` is not switched on behind the participant's back. The composer chip now makes that state visible on every note.
- **The name nudge follows.** Its rule "show-name on" now means the default. Nothing else changes.

## Out of scope

- Changing the author of a published note.
- Per-column anonymity rules set by the facilitator (`facilitator-moderation`).
- Avatars (`profile-avatars-and-team-space`).

## Bounded contexts

- Profile (local).
- Ideation: author display.

No relay traffic: the name already travels inside encrypted events.

## Capabilities

### Modified Capabilities

- `profile`: name shown by default.
- `notes`: signature in the composer.

## Impact

- Web: `NameDialog.vue`, `ProfileDialog.vue`, `stores/identity.ts` (default when a name is first set), `PrivateSection.vue` (signature chip), i18n.
- Domain: unchanged (`author` already follows `showName`).
