# Proposal

## Why

A participant who receives a link in a chat can click it, but one who is told the link (or copies it from a document) has no obvious place to put it. The landing page only offers to create a board or try solo.

## What Changes

- A "paste a board link to join" field on the landing page. Only the part after the `#` is used, it is validated locally and never sent anywhere.
- A clear inline error when the text is not a RetroBoard link.

Out of scope: QR scanning and knock-to-join codes (change short-links-and-join).

Bounded contexts: presentation. No relay traffic, no new storage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: landing page, fr and en strings.
