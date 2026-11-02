# Proposal

## Why

Owner feedback (2026-10-29): board URLs are long and the owner wants short links (like YouTube ones) and the /boards/ path; the landing page needs a way to join an existing board by code or QR; the three words shown with the QR code ("jasmine - pebble - fox") are not explained. The key must stay in the URL fragment and nothing may be stored on our side, so a link that carries a 128-bit key cannot drop below about 22 key characters; shortening means a tighter encoding, not a lookup table.

## What Changes

- Path `/boards/<id>`; old `/board/` links redirect (client and Worker).
- Compact link: short room id plus a 22-character base64url key in the fragment; old links keep working.
- Landing "Join a board": paste a link, scan a QR code with the camera (where supported), or knock with a short join code.
- Knock join: an open board shows a 6-character code valid 10 minutes; the joiner enters it, the relay (memory only) forwards a knock to the room, a facilitator approves and the link is sealed to the joiner's ephemeral public key. The relay never sees the key.
- Room words labelled: "Board words: read them aloud to check that everyone is on the same board".

Owner feedback (2026-11-02): pasting a link to join is useful but not practical; joining must work with a short code or string. Promoted: the knock code becomes the main way to join by hand.

- One join field on the landing page accepts a link, a short code (`RB-7KQ2M9`, no look-alike characters) or the room words read aloud ("jasmine pebble fox").
- The code is shown large in the invite panel and on the presenter screen, so a room can join from the TV without any link.
- Any participant online on the board can let the knocker in (not only a facilitator) when the board allows it; the board shows who is knocking and the request expires with the code.
- A short code cannot carry the 256-bit key, so someone holding the board must be online to seal the link to the joiner: when nobody is, the screen says so and offers the link instead.

Out of scope: vanity links, accounts.

Bounded contexts: Room access, Sharing. Relay: one forwarded knock per join attempt, rate limited; memory only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `sharing`
- `room-access`

## Impact

- New ADR (link format and knock); web routes; relay knock forwarding; crypto sealed handoff.
