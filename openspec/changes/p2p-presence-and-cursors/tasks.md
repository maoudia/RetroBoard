# Tasks

## 1. Signalling and mesh

- [x] 1.1 Add encrypted `signal` envelopes to the protocol and relay forwarding; verify unit tests and that signalling payloads are ciphertext in an e2e frame inspection
- [x] 1.2 Implement the WebRTC mesh (offer/answer/ICE, retries, partial mesh above 12) carrying board events and cursors; verify e2e (2 contexts, no `pub` to the relay) and unit tests of the topology

## 2. Cursors

- [x] 2.1 Implement anchored cursor frames, interpolation and the cursor layer (label, colour, avatar); verify unit tests of anchor mapping and e2e: B sees A's cursor over the same note with a different viewport
- [x] 2.2 Relay path at 4 Hz while moving, with a separate relay budget for `eph` frames that drops excess silently; verify relay unit tests and e2e
- [x] 2.4 Touch devices: focus sharing, cursor only while dragging, avatar markers on column tabs and notes instead of floating cursors; verify e2e on the phone project
- [x] 2.3 Add display cap (10 most recent) and presenter-mode hiding; verify unit test of the selection and e2e of presenter mode

## 3. Presence and settings

- [x] 3.1 Add presence states (online, idle, typing in column; speaking comes with talk-time) to the participants menu; verify e2e
- [x] 3.2 Add profile settings "Share my cursor", "Show others' cursors", "Relay-only (hide my IP from peers)" with fr/en strings and privacy page text; verify e2e for each toggle

## 4. Peer-to-peer board (owner decision 2026-10-24)

- [x] 4.1 Relay-only fallback with a bridge peer; verify e2e with one participant forced relay-only
- [ ] 4.2 Production check of link success rates behind corporate networks (manual, documented in docs/capacity.md)
- [ ] 4.3 Signed snapshots and snapshot-based join (moved from stateless-relay-and-replication 4.2); verify unit test with 3,000 events and e2e late joiner
