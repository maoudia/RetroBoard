# Design

- Auto agenda: `AgendaState.chain` (default true). One facilitator client sends the idempotent command `agenda.advance {from}` when the planned time of phase `from` has elapsed; the handler ignores it unless `current === from`, the clock is not paused and the time is really over, so duplicate sends from several facilitators converge. `agenda.extend` moves the deadline so nothing fires.
- Announcements reuse the existing phase toast/announcer.
- Similarity: lowercase, strip accents, drop stop words (fr+en), crude stemming (plural s/x), weight words by inverse frequency across the board, cosine score plus character trigram fallback for short texts.
- Keyboard: send and add buttons keep focus on pointerdown (preventDefault) and the field is refocused synchronously after submit.
- Vote bar: tickets (lucide:ticket) filled for remaining votes, outlined for used.
