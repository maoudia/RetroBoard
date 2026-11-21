# Proposal

## Why

The owner reviewed the live Scrum Poker and gave two directions. The second is this change: "Poker must reuse the maximum of RetroBoard's features (themes, encryption, export, every feature of RetroBoard that can be reused) so that it is not a separate product but a narrow mode integrated in the RetroBoard product."

Today it is a separate product that happens to share a transport. Read in the code of release 1.67:

- **It looks like another app.** The room takes the device's default theme, not a room theme: nothing in a poker room says which theme the moderator chose, because there is no such choice (`apps/web/app/poker/` has no `themeId`; the `theme.client.ts` plugin applies the device's default theme to every page). The nine themes, their light and dark variants, the genre themes and the rule "the facilitator picks the theme, everyone else picks only light or dark" (ADR-0006) are not reached.
- **It has its own front door.** `/poker` is a page of its own with a deck and a button; `/new` (title, theme, passcode, team and project, simple or advanced mode, the quick start) does not know it exists. The landing page, the boards menu and the library page each carry a separate "Scrum Poker" button next to the real flow.
- **It does not appear where work lives.** A poker room is not a library entry (`LibraryEntry` has no kind), so it is not in the recent boards, the library, the team's list or the vault sync; a finished session is gone when the tab closes.
- **It re-implements what exists.** The room has its own socket client (`PokerClient`: connect, retry, heartbeat, history, re-upload after a relay restart), its own strings loader, its own overflow menu with its own language and light-or-dark items, its own invite sheet, its own name step and its own tab-storage keys. Each is a smaller copy of a thing the boards already have and the room cannot get the rest of (peer-to-peer links, presence and avatars, the passcode, the join code, the local replica, the share templates, the chat, the timer, the export hub).
- **It cannot talk to a retro.** The two things a team does one after the other, a retro that ends with actions and an estimation of them, share no data: there is no way to estimate an action, to bring stories from a board or to continue with the same people.

The fix is not to add features to poker; it is to make poker a *kind* of the product that already has them. The first thing to do is to look at every feature of RetroBoard and decide, for poker, whether it is reused as it is, reused with a named adaptation, or not applicable, with the reason and the place in the code or the spec where it lives. Then to specify the integration, and to list as removal tasks everything that poker built instead of reusing.

## Sequence

Owner decision of 2026-11-21: the standalone poker is kept and finished first, and the integration with the board comes after. The order of the four poker changes is: (1) finish the actual poker, group 6 of `poker-design-v2` (in progress, another worker); (2) `poker-deck-studio`, which stays inside the standalone poker and replaces its typed comma list and its coffee card; (3) **`poker-in-retroboard`, this change**; (4) `board-estimation-phase`. This change is an additive follow-up: it does not rewrite or supersede the released text of `poker-design-v2` or `scrum-poker`; `design.md` ("What this replaces once it is implemented") names what each task replaces when it is built, and that task's pull request amends the older text. It starts when `poker-deck-studio` has merged its groups 1 and 4 (the cards and the gallery it reuses) and `board-estimation-phase` starts after it. Group 7 waits for the first groups of `board-estimation-phase`.

## What Changes

This change is the design and its spec, written first. It ships no application code; `tasks.md` is the implementation, in eight groups ordered by what the owner sees first (the theme, the creation flow and the library, the export), then what makes the room feel like the product (shared session, room tools), then the link with the retro.

- **A reuse matrix** (`design.md`, "The reuse matrix") that goes through every feature found in the repository, 89 rows in 10 areas: 30 reused as they are, 44 reused with a named adaptation, 15 not applicable with the reason. Each row says where the feature lives, what poker does today and which task of this change delivers the reuse. A second table names every shared component reused, and a third lists the 15 duplicates in the poker code as removal tasks.
- **One product, one theme rule.** A poker room has a theme chosen by its moderator, written in the room (`room.theme`), imposed on everybody; light or dark stays personal. The nine themes and the genre themes work in the room, and the card skins of `poker-deck-studio` follow them. The start and creation pages keep the product design, as every product page does.
- **One creation flow and one landing.** The landing page and `/new` offer a clear choice between a retro and an estimation; the estimation takes the same form (title, theme, passcode, team and project, simple or advanced mode, the quick start) with the deck gallery of `poker-deck-studio` in place of the format picker. `/poker` stays as a public page and a one-press shortcut, not a second creation page.
- **Poker rooms are first-class library entries**: in the recent boards, the library and the boards menu with a kind and a filter, in the team's list, in the vault sync, in the share dialog (link, QR, templates, passcode, short code) and in every join path (landing field, QR scan, short code with approval).
- **The same session underneath.** The poker room runs on the board session's transport, replica and presence instead of its own client; the room tools (chat, the shared timer, talk time, presentation and TV mode, the activity feed, moderation, notifications, shortcuts) are reused through a short allowlist of shared commands, the way the access rules already are.
- **Retro and estimation meet through the board's phase.** The owner prefers the estimation of a retro's tickets to be a phase of the board itself, on the same link, with the same people (`board-estimation-phase`, specified next to this change). This change does not build a second way in: it adds the room's side, importing stories from a board into a room, an "Estimate" entry on an action or a note that starts that phase, and sending a room's estimates back to a board.
- **One export hub.** A poker session exports through the same export door as a board: Markdown, CSV (a layout Jira's import accepts), JSON, a copied text card, the destinations, an estimation report, and "estimates only" in place of "actions only". Per-person cards are not exported unless the person asks.
- **Built from the product's own parts.** Owner constraint of 2026-11-21: poker keeps RetroBoard's design language, with the same components, tokens, layout patterns, dialogs, menus, buttons, toolbar, share panel and settings. The design lists each reused component by name ("Shared components reused"), marks existing and new parts in its wireframes, and every place where the poker UI has its own look instead of a shared component is a removal-and-move task. Only the cards and the deck tiles (`poker-deck-studio`) are new surfaces, and those are made of the existing tokens, radii, spacing, motion and themes.
- **Removal tasks** for every duplicate (table "Duplicated in the poker code", 15 items), each with the file, what replaces it and the task that deletes it.

Out of scope: the estimation domain itself (`scrum-poker`: stories, rounds, statistics, decisions), the look of the room and of the cards (`poker-design-v2`, `poker-deck-studio`), importing from Jira (`jira-estimation-import`, which plugs into the same stories list), a merged room that is both a board and a poker room (ADR-0042 keeps them two kinds), accounts, anything stored by us, video or voice, AI estimates, the public page `/poker` (task 7.1 of `scrum-poker`, which this change only links to).

Bounded contexts: Presentation, Sharing and Room access, Profile and Team, Outputs (exporters), Board session (the shared transport and ledger), Estimation (read models and exporters over what `scrum-poker` builds), Facilitation (the room tools). New domain surface: one poker command (`room.theme`) and the allowlist of shared commands in the ledger fold. There is no new board command and no change to `ActionItem` here: where a board keeps an estimate is `board-estimation-phase`'s.

Relay traffic and the free-plan budget: no new traffic of its own. A poker room on the shared session sends the presence frames a board sends (a join costs about n squared over 2 messages, already counted in ADR-0042 finding 3), chat messages and timer events at the rates a board has. `room.theme` is one sealed event a room. The arithmetic and the budget for each is in `design.md` "Budgets".

Bundle budget: the entry chunk is already at its 56.5 kB limit and the total is 419.8 kB of 500 kB (measured 2026-11-21). The groups are designed to add nothing to the entry that is not removed from it (the poker entry labels and the duplicate menu go), to load the room tools lazily with the poker page, and to cost at most 20 kB gzip in all on the total on top of `poker-deck-studio`'s 24 kB. Any task that must grow the entry says so and asks for the budget line it needs, as the owner has done for the poker seam before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scrum-poker`: the room's theme, creation, library, share and join paths, session, room tools, links with a board and export (delta in this change, in the same form as the other poker deltas: the capability is still being built, so the requirements are added).
- `board-session`: one creation flow for a retro and an estimation (delta in this change).
- `themes`: a poker room has a theme chosen by its moderator and imposed (delta in this change).
- `export`: a poker session exports through the export hub (delta in this change).
- `room-access`: the shared room tools are folded in both kinds of room (delta in this change; it refines the delta of `scrum-poker` and does not change ADR-0042's decision, see `design.md` S4).

## Impact

- Changed: `apps/web/app/pages/index.vue` (the landing choice), `pages/new.vue` and `components/BoardSetupForm.vue` (a kind), `pages/boards.vue`, `components/LibraryList.vue`, `LibraryPage.vue`, `AppToolbar.vue`, `RecentBoards.vue`, `ShareDialog.vue`, `ExportDialog.vue`, `ActionsDrawer.vue` and `NoteMenu.vue` (the "Estimate" entry), `stores/library.ts`, `stores/recents.ts`, `stores/board.ts` (a kind-aware session), `stores/theme.ts`, `adapters/replica-*.ts`, `transport/*` (the poker send), `packages/domain/src/access/ledger.ts` (the allowlist), `packages/domain/src/estimation/poker.ts` (`room.theme`), `packages/protocol/src/poker.ts` and `v1.ts` (the allowlist of command types), `packages/application/src/storage/library.ts` (a kind), `packages/exporters` (the session exporters), `apps/web/app/poker/*` and `components/poker/*` (rebuilt on the shared pieces), `tests/e2e/poker.spec.ts`.
- Removed: `apps/web/app/poker/client.ts` (the relay-only client), the poker overflow menu and invite sheet, the poker name step and its storage keys, the poker media-query helper, the poker start page as a creation page (full list in `design.md`).
- Added: the exporters of a poker session, the board picker of the stories import, the sending of a room's estimates to a board, the guide chapter text, the ADR for the room tools.
- Docs: `docs/architecture.md` (the poker room on the shared session), `docs/design-system.md`, `docs/DEVELOPMENT.md`, the user guide in fr and en and its manifest (`tests/docs/manifest.ts`), regenerated with `pnpm docs:tour && pnpm docs:guide`, the privacy page text, `docs/accessibility.md` where a pattern is added.
- Not changed: the relay, the envelope, sealed ballots, CSP (no inline script or style, no third-party origin), the themes package (no field added), the vault format beyond the optional `kind` of a library entry.
