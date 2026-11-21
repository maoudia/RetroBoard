# Proposal

## Why

Owner note (2026-11-20): "Add a Scrum Poker feature in the spirit of scrumpoker-online.org room pages; be creative, it is big."

Teams that run retros also run estimation sessions, usually with a separate free tool. scrumpoker-online.org is the model the owner points at: open a room in one click, share a link or a QR code, everybody picks a card, the owner reveals all cards at once and resets for the next story, with no account for the core flow; its extras (timer, average and median, attendance, a reusable room) sit behind a paid tier, and it deliberately has no Jira integration (its own FAQ says so and suggests copying estimates by hand). RetroBoard already has what such a tool needs and most competitors lack: end-to-end encrypted rooms with no server storage, peer-to-peer play with a relay fallback, a secret and sealed ballot, a timer and talk time, themes, fr and en, and a team space. A poker room built on it is free, private and account-free by construction, and the pricing position of the project (no tiers, no sponsorware, ADR-0040) means every extra the competitor sells is simply included.

It is also the best acquisition surface the project can have: a person who needs "scrum poker online" lands on a page that is useful in 20 seconds, and later finds the retro board.

## What Changes

This is an epic of seven task groups (about 16 to 20 agent sessions). Nothing ships before the architecture spike of group 1 is accepted.

- **A poker room is a second kind of room** on the same transport and encryption: a link with a key in the fragment, a join code, an optional passcode, peer-to-peer with the relay as fallback, nothing stored by us (ADR-0042, accepted after the spike). It is not a retro board in disguise: it has its own small domain (stories, rounds, cards, votes, decisions).
- **One click to start.** `/poker` offers "Start a room" with a name and a deck. The room page shows the table and a share button (link, QR, short code). Joining is a name and nothing else.
- **The table.** Participants sit around a table as avatars with a face-down card once they have voted, never showing the value before the reveal. Voters see their hand of cards at the bottom (a big, thumb-sized hand on a phone, digit keys on a keyboard). The facilitator reveals, and the cards flip together with a themed motion (still under reduced motion).
- **Ballots are sealed.** Votes are sealed until the reveal with the primitives of the existing sealed ballot and a key per round published at the reveal, so no other participant, even with a modified client, can peek early (the moderator's own device holds the round key and is trusted not to look, as on a board), and a late joiner or a reload mid-round does not leak anything.
- **Results that help the discussion, free.** Average, median, mode, spread, a consensus meter, the cards of the lowest and the highest voters highlighted with a "please explain" timer (reusing the talk-time timer), a suggested estimate (the nearest card to the median), and a "re-vote" that keeps the history of the rounds of the story. Observers watch without a card.
- **Stories and decisions.** A backlog of stories (typed, pasted as a list, or imported: see `jira-estimation-import`), a current story, a final estimate the facilitator decides, "next story", and a session summary with the total.
- **Decks.** Fibonacci, modified Fibonacci, T-shirt sizes, powers of two, hours and days, and a custom deck, with "?" and the coffee card; a team's default deck lives in the local team space.
- **Roles.** The creator moderates by default (one moderator avoids an accidental reveal; unlike retros, "everyone facilitates" is an option, not the default), voters, observers.
- **Creative extras that cost nothing.** Cards and table use the retro themes; emoji throws between seats; an optional countdown; auto-reveal when everyone has voted; a "quick estimate" mode that skips stories; a result card to copy (image-free text and CSV) for the ticket.
- **Library and sync.** A finished or paused room is an entry of the local library and travels with the encrypted vault (`user-drive-storage`) like a board; the session summary exports through the three doors of `export-consolidation`.
- **A public page** `/poker` (fr and en) with the same care as the format pages of `public-launch`: one clear action, a short explanation of why it is private, an FAQ, structured data, and the Lighthouse and axe budgets.

Out of scope: accounts or paid tiers, persistent rooms stored by us, a leaderboard or user statistics kept by us, video or voice, direct writes to Jira (see `jira-estimation-import`), AI estimates, shared cursors (disabled, `cursors-off-for-now`).

Bounded contexts: a new Estimation context (domain: stories, rounds, votes; application: statistics and decisions), Sharing and Room access (reused), Presentation. Relay traffic: small events (one per vote, reveal, decision), the same budgets as a board; see `design.md` for the cap on voters and the idle cost (none). Free-plan impact, checked in task 1.1 (arithmetic in ADR-0042): a 20-voter hour is about 1,170 events and 80 to 178 billed requests of the 100,000 a day, a sixth of the events of a retro with the same people in the same worst case; the cap is 20 voters inside the 30 connections of a room.

## Capabilities

### New Capabilities

- `scrum-poker`: rooms, rounds, decks, sealed votes, results, stories, roles, export, the public page.

### Modified Capabilities

- `room-access`: a room has a kind, written once in its signed genesis, and the link, the code and the passcode are the same for every kind (delta in this pull request, from the spike of task 1.1).
- `relay-core`: the relay carries no room kind (delta in this pull request; the behaviour exists, the requirement and its test are new).

The rest of the transport (envelopes, mesh, replica, anti-entropy) is reused as it is.

## Impact

- New: `packages/domain/src/estimation/`, `packages/application/src/estimation/`, web pages `/poker` and `/poker/room` (the room id stays in the fragment), components for the table, hand and results, i18n fr and en, guide chapter, ADR.
- Reused: `packages/protocol` envelopes and the relay (memory-only), `packages/crypto` (sealed ballots), the mesh transport, the timer and talk time, themes, the team space, the vault library.
- Docs: `docs/architecture.md`, `docs/PLAN.md` map of contexts, landing and sitemap entries.
