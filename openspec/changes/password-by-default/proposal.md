# Proposal

## Why

Owner feedback (2026-11-02): protecting a board with a passcode must be the default. Generate a human-readable passcode like Apple Passwords in simple mode and offer a full generator like KeePassXC in advanced mode, always let the person override it, and bring the field to the top of the creation form instead of a lost section. An empty passcode stays possible, but only as an informed choice that states the risks.

Clarification for the record: board content is already end-to-end encrypted for every board, with or without a passcode. The 256-bit room key travels only in the link fragment and never reaches the relay (requirement "Fragment key"). The passcode is a second factor: whoever holds only the link (chat history, link previews, screenshots, synced browser history) can read and write the board when there is no passcode, and cannot when there is one. So "force encryption" is already true; what changes is that the second factor becomes the default.

## What Changes

- Passcode on by default at creation, in simple and advanced modes, placed right under the board title.
- Simple mode: a generated human-readable passcode (three groups of six letters with one digit and one capital, for example `kofbe2-Zyxpaw-myhgub`), a regenerate button, show and hide, copy; the person can type their own.
- Advanced mode: a generator panel like KeePassXC: length 8 to 64, character classes (lower, upper, digits, symbols, extended), exclude look-alike characters, every class required, passphrase mode (word count, separator, capitalisation, fr or en word list), and an entropy meter in bits with a strength label.
- "No passcode" is an explicit choice behind a confirmation that lists the risks (anyone with the link reads and writes; links leak through chats, previews, screenshots and history sync) and what the passcode protects (a link posted in a shared channel stays unreadable without it).
- The passcode is remembered on this device (with the local copy, same retention) so the creator and returning participants are not asked again; the invite panel copies the link and the passcode separately and advises to send them through two channels.

Out of scope: changing the passcode of an existing board (the content key derives from it; it needs the room migration of `facilitator-moderation`).

Bounded contexts: Access (room keys), Facilitation (creation). No relay change, no new traffic. Cost: one PBKDF2 stretch (600k iterations) per open, about 0.3 s on a mid-range phone.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `room-access`: the passcode becomes the default, with generators and an informed opt-out.

## Impact

- Packages: a pure passcode generator with injected randomness and word lists (permissive licence, size checked against the bundle budget).
- Web: creation form, invite panel, passcode prompt, local key store.
- Docs: security page and `docs/PLAN.md` section 5.1.
