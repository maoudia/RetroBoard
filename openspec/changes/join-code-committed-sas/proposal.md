# Proposal

## Why

Joining by code relies on a 6-digit safety number that the holder compares with the joiner. The number is the first 32 bits of the hash of the joiner's one-time public key, reduced to 6 digits (`apps/web/app/utils/join-code.ts:37-43`). Knocks are sealed with a key derived from the code itself (`join-code.ts:34`), so anyone who sees the code reads the joiner's public key, can search about a million key pairs for one with the same number, and can knock with the same name. The holder filters duplicates by nonce only (`apps/web/app/utils/join-flow.ts:55`) and sees two identical requests; admitting the wrong one seals the board link, key included, to the attacker. The relay can do the same and also withhold the genuine knock; it can recover the code from the side room id, an unsalted hash of a 30-bit code (`join-code.ts:31-33`). The spec promises a join "without the relay ever receiving the board key".

## What Changes

- Now: the holder refuses and flags two pending knocks that show the same safety number, with a message that says why (fr/en).
- Next: a committed number. The joiner sends a commitment to its key, the holder answers with a fresh random value, the joiner reveals the key, and both sides compute the number from the key and the holder's value. A key can no longer be searched after the fact.
- Old and new clients interoperate for one release: a holder accepts both knock kinds and labels the old one "not verified".

Out of scope: longer codes, a password-authenticated exchange, changes to invitation links.

Bounded contexts: Access. Relay traffic: two more small frames per join.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `room-access`: join by code resists a party who knows the code.

## Impact

- `apps/web/app/utils/join-code.ts`, `apps/web/app/utils/join-flow.ts`, `apps/web/app/composables/useJoinByCode.ts`, `apps/web/app/stores/join-host.ts`, the knock list component, i18n fr/en.
