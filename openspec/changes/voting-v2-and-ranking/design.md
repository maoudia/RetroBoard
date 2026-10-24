# Design

## Decisions

- `Ballot` aggregate in `domain/voting` with `VotePolicy` value object; items referenced by `VotableRef = { kind: 'note'|'cluster', id }`.
- Hidden counts: votes are normal encrypted events; read models hide others' votes until `TallyRevealed`. A technical participant could read them from the log; the UI labels this mode "hidden" not "secret".
- Sealed ballot: each vote payload is sealed to the facilitator's X25519 key; the facilitator device computes the tally and publishes a signed `TallyRevealed { counts }`. Limits are enforced by the facilitator device (others cannot see votes) and by each voter locally.
- Ranking read model: dense ranking with ties ("1, 2, 2, 4"), podium component with rise animation in `packages/ui`.

Security and privacy note: sealed ballot hides votes from participants and from the relay; the facilitator's device sees individual votes but the UI never displays voter identities.

## Risks / Trade-offs

- [Facilitator offline during sealed ballot] -> votes queue in the log; tally when the facilitator returns or after hand-over.
