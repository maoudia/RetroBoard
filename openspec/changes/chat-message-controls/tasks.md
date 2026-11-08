# Tasks

## 1. Domain and protocol

- [ ] 1.1 `chat.edit` and `chat.delete` handlers (author or moderator, tombstone shape, `edited`, no-ops, not-found), `ChatMessage` and snapshot mapping, valibot schemas in the protocol; verify unit tests incl. invalid and forbidden events ignored, out-of-order fold through the event log, late joiner state, cap with tombstones, `chat.clear` removing tombstones
- [ ] 1.2 Application use cases `editChatMessage`, `deleteChatMessage` with local checks (own message, facilitator) and the rate-limit refusal; verify unit tests with fakes

## 2. Chat panel

- [ ] 2.1 Per-message menu (hover, focus, long press), Edit in place and Delete for the author, Delete for a facilitator, tombstone rows and the "edited" mark (fr/en); verify e2e with three contexts (author, participant, facilitator) at 360 and 1280 px and axe light and dark
- [ ] 2.2 Clear-all confirmation with the message count; verify e2e

## 3. Guard and guide

- [ ] 3.1 A test that the report and every exporter contain no chat text; verify exporter unit tests
- [ ] 3.2 Update the guide manifest step and chapter text (fr/en) for the chat, regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`

## 4. Optional delight

- [ ] 4.1 Undo for 5 seconds after deleting your own message (held client side, sent on expiry or `pagehide`); verify e2e with fake timers and that a closed tab still sends the delete
