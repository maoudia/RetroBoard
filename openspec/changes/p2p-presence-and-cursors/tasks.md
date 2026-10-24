# Tasks

## 1. Signalling and mesh

- [ ] 1.1 Add encrypted `signal` envelopes to the protocol and relay forwarding; verify unit tests and that signalling payloads are ciphertext in an e2e frame inspection
- [ ] 1.2 Implement the WebRTC mesh adapter (offer/answer/ICE, reconnect, partial mesh above 12) behind `PresencePort`; verify an e2e with 3 browser contexts establishing channels

## 2. Cursors

- [ ] 2.1 Implement binary cursor frames, interpolation and the cursor layer (label, colour, avatar); verify e2e: B sees A's cursor move, median latency logged under 150 ms locally
- [ ] 2.2 Implement relay fallback at 4 Hz while moving; verify e2e with WebRTC disabled in one context
- [ ] 2.3 Add display cap (10 most recent) and presenter-mode hiding; verify unit test of the selection and e2e of presenter mode

## 3. Presence and settings

- [ ] 3.1 Add presence states (online, idle, typing in column, speaking) to the participants menu; verify e2e
- [ ] 3.2 Add profile settings "Share my cursor", "Show others' cursors", "Relay-only (hide my IP from peers)" with fr/en strings and privacy page text; verify e2e for each toggle
