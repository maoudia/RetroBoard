# Design

## The weakness

The side room of a join code is readable by anyone who knows the code (the key of its envelopes is derived from the code, `join-code.ts`). A request carries the joiner's one-time public key, and the holder and joiner compare six digits derived from that key alone. Someone who read a request can search about a million key pairs for one with the same six digits and knock under the same name. Group 1 makes the holder drop two requests that show the same number. That does not stop a request that is ground **before** the real one arrives, or a relay that withholds the real request.

## Committed number (group 2)

Three messages replace the one knock, all inside the same sealed side room:

| Step | Sender | Message | Content |
|---|---|---|---|
| 1 | joiner | `knock2` | nonce `n`, commitment `c = SHA-256("rb-join-commit\|n\|" \|\| pub)`, name |
| 2 | holder | `challenge` | nonce `n`, 16 fresh random bytes `h` (one per request) |
| 3 | joiner | `reveal` | nonce `n`, the key `pub` |

The holder accepts the reveal only when `c` matches `pub`. Both screens then show `digits(SHA-256("rb-join-sas\|n\|" \|\| h \|\| pub))`.

Why this resists grinding: the number depends on `h`, which the holder draws after the commitment and separately for every request. An attacker who commits to a key `pub'` gets its own `h'`, so the number of the attacker's request is unrelated to the number of the real one, and the attacker cannot search for a key that matches because `h'` is unknown when the commitment is made. Six digits then give an attacker one chance in a million per attempt at being accepted by a holder who compares numbers, and a request that fails the comparison is refused by a person.

What does not change: whoever knows the code can still send requests (the code is what lets someone knock), up to `MAX_KNOCKS` pending ones, and the holder still decides. The relay still sees only sealed envelopes and a room id derived from the code; it learns nothing it did not know. A relay that withholds messages can only make a join fail.

## Compatibility

- Older holders ignore `knock2` (`openJoinMsg` returns null for unknown kinds). The joiner waits `COMMIT_WAIT_MS` (3 s) and sends the plain `knock` with the plain number.
- Older joiners send `knock`. The holder accepts it, shows the plain number and labels the request "not verified" (fr/en).
- The fallback and the label are removed one release later (task 2.3), so an attacker cannot downgrade a new joiner to the plain exchange for long: a downgrade needs the holder to be old, and the joiner's wait is the only delay.

## Where it lives

`apps/web/app/utils/join-code.ts` (`commitKey`, `committedNumber`, message kinds), `join-flow.ts` (both sides, `COMMIT_WAIT_MS`), `components/ShareDialog.vue` (the label). No domain or relay change; relay traffic grows by two small frames per join.
