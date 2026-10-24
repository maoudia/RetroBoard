# Tasks

## 1. Signalling and mesh

- [ ] 1.1 Add encrypted `signal` envelopes to the protocol and relay forwarding; verify unit tests and that signalling payloads are ciphertext in an e2e frame inspection
- [ ] 1.2 Implement the WebRTC mesh adapter (offer/answer/ICE, reconnect, partial mesh above 12) behind `PresencePort`; verify an e2e with 3 browser contexts establishing channels

## 2. Cursors

- [x] 2.1 Implement anchored cursor frames, interpolation and the cursor layer (label, colour, avatar); verify unit tests of anchor mapping and e2e: B sees A's cursor over the same note with a different viewport
- [x] 2.2 Relay path at 4 Hz while moving, with a separate relay budget for `eph` frames that drops excess silently; verify relay unit tests and e2e
- [x] 2.4 Touch devices: focus sharing, cursor only while dragging, avatar markers on column tabs and notes instead of floating cursors; verify e2e on the phone project
- [ ] 2.3 Add display cap (10 most recent) and presenter-mode hiding; verify unit test of the selection and e2e of presenter mode

## 3. Presence and settings

- [x] 3.1 Add presence states (online, idle, typing in column; speaking comes with talk-time) to the participants menu; verify e2e
- [ ] 3.2 Add profile settings "Share my cursor", "Show others' cursors", "Relay-only (hide my IP from peers)" with fr/en strings and privacy page text; verify e2e for each toggle
