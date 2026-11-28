# Design

Design first: this change goes through every feature of RetroBoard, decides what each means for poker, and specifies the integration so that a person moves between a retro and an estimation without feeling a different product. It ships no code. It is checked against `docs/PLAN.md` (the non-negotiables), `openspec/config.yaml`, ADR-0004, ADR-0006, ADR-0021, ADR-0042 and ADR-0044, the specs in `openspec/specs/`, and the code of release 1.67.0 (commit `f45f547f`).

Sequence (owner decision of 2026-11-21): (1) the actual poker is finished first, group 6 of `poker-design-v2` (another worker); (2) `poker-deck-studio`; (3) **this change**; (4) `board-estimation-phase`. This change is an additive follow-up: it does not rewrite the text of `poker-design-v2` or `scrum-poker`, and "What this replaces once it is implemented" (below) names, row by row, what each of its tasks replaces when it is built. It is written to be consistent with `board-estimation-phase`, which the owner prefers as the shape of the integration with a retro (see "Three ways to estimate").

Evidence: `before/` holds six screenshots of release 1.67.0 (the landing page, `/new`, the library, and the same room on two phones with two device themes) and `before/README.md` says what each proves.

## What the owner sees today

A poker room is reached from a third button on the landing page, a line in a menu and a button on the library page. It opens on a page of its own that asks for a deck. The room that follows has no theme of its own (each phone shows its own device theme), no chat, no timer, no avatar picture, no passcode and no export; it is not in the library, so a finished session cannot be found again; the only thing it shares with the rest is the encryption and the relay. Inside, the code is a second implementation of things the boards already have.

## Three ways to estimate

After the four changes of the sequence there are three ways to estimate in RetroBoard. They share the cards, the decks and the skins of `poker-deck-studio`, the table, hand and results of `poker-design-v2`, the estimation domain of `scrum-poker` and the export of this change.

| Way | For | Where the round state lives | Defined by |
|---|---|---|---|
| **A poker room** (standalone) | An estimation session that is not part of a retro: a refinement with its own people, tickets typed or imported | The room's own ledger (ADR-0042, kind `poker`) | `scrum-poker`, finished by `poker-design-v2`, made part of the product by this change |
| **A poker room started from a board** | The same, with stories brought from a board's library entry | The room's own ledger | This change, group 7 |
| **The estimation phase of a board** (preferred in a retro) | Tickets already on a board: the facilitator runs a voting phase on the same board, same link, same people | The board's own ledger, in a field of its own (the recommendation of ADR-0045) | `board-estimation-phase` |

This change does not build a second way into a retro. It does not hand a retro's people to a separate room, and it does not write a room's result into a board by a side channel: where a board and a room meet, the board's side is the phase of `board-estimation-phase`.

## Principles

| Principle | Rule |
|---|---|
| One product | A person can tell nothing about a poker room's chrome from a board's except what is about estimating (S1, the component map) |
| Reuse first, in this order | An existing component or token as it is; the same with a named adaptation; a new surface only for the cards and the deck tiles, and those from the existing tokens |
| The room is a kind, not a product | The same link, key, passcode, presence, replica, library, vault, export and docs (ADR-0042); the relay stays kind-agnostic |
| Imposed look, personal variant | The moderator's theme for everybody, light or dark for oneself (ADR-0006) |
| No second implementation | Every duplicate in the poker code is a removal task with its replacement (the removal table) |
| Nothing to us, nothing in the clear | Zero infrastructure, no storage on our side, no telemetry (N1, N2, N3, N6); a deck, a story and a card are content |

## The reuse matrix

Every feature found in the repository, in 10 areas (A to J). **Verdict**: `R` reused as it is, `A` reused with the named adaptation, `N` not applicable, with the reason. **Where it lives** cites the code or the spec; **Poker today** is the state of release 1.67.0; **Task** is the task of this change that delivers the reuse (or `-` when nothing is to be done). A component is named in `code font` the first time a row uses it, and the "Shared components reused" table below lists them all.

### A. Look

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 1 | The nine themes | `packages/themes/src/index.ts` `THEMES`; spec `themes` "Board theme"; `ThemePicker.vue`; `useThemeStore` | The device's default theme; no room theme | A | The moderator picks the theme and a new poker command `room.theme` writes it into the room (S2); the room applies it with `useThemeStore.use` | 1.1, 1.2 |
| 2 | Genre themes (`themes-pop-culture`) | `openspec/changes/themes-pop-culture` | None | R | They arrive in `THEMES`; the card-skin test of `poker-deck-studio` (a theme without a skin fails) makes the room ready for them | 1.4 |
| 3 | The imposed-theme rule | ADR-0006; specs `themes` "Theme set by the facilitator", `facilitation` "Theme by any lead" | A person's device theme | A | Only a lead or a co-facilitator writes `room.theme`; a participant sees the picker read-only with who can change it | 1.1, 1.3 |
| 4 | Light and dark variant, personal | `stores/theme.ts` `variant`; `settings.variant`; spec `themes` "Light and dark variants" | `PokerMenu.vue` re-implements the item and reads `document.documentElement.dataset.variant` | R | The shared toolbar's variant control; the poker copy is deleted (removal D3) | 1.2, 5.5 |
| 5 | Product pages use the product design | spec `themes` "Product pages use the product design" | The start page and the name step | R | The landing, the creation page, the library, the start and name steps keep the product design; only the room itself takes the room theme | 1.2 |
| 6 | Theme animation and ambient layer | `AmbientLayer.vue`; `settings.ambient`; spec `themes` "Theme animation choice at creation" | None | R | The room mounts the same layer (bats, snow, petals, matrix) under the same reduced-motion rules and the same personal switch | 1.2 |
| 7 | Theme fonts, rings and colours | `ThemeDefinition.loadFonts`, `ringColors`, `applyTheme` | Applied by the page-wide plugin | R | Nothing to do: `applyTheme` writes every token the room's cards, timer rings and charts read | - |
| 8 | Seasonal and team default theme | `suggestThemeForDate`; `TeamDefaults.themeId`; `new.vue` `applyTeamLook` | None | R | The creation page prefills the theme the same way for an estimation | 2.2 |
| 9 | Density and zoom | `stores/layout.ts`, `utils/layout.ts`; `settings.density` | Fixed sizes, the type scale only | A | The table, the hand and the results honour density and zoom like the board; the type scale of wide and TV screens stays | 6.4 |

### B. Privacy and access

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 10 | End-to-end encryption, key in the fragment | ADR-0004; spec `room-access` "Fragment key", "Encrypted events"; `packages/crypto/src/room.ts` | Same primitives (`deriveContentKey`, sealed events) | R | Nothing to do; the matrix rows below must not weaken it | - |
| 11 | Compact links, facilitator and participant link | ADR-0029; `formatInvite`, `participantRing`, `parseInvite` | Used | R | Nothing to do | - |
| 12 | Passcode: optional, by default, generator, remembered | spec `room-access` "Optional passcode", "Passcode by default", "Passcode generator", "Remembered passcode"; `PasscodeField.vue`, `PasscodeDialog.vue`, `adapters/passcode-vault.ts` | None (`scrum-poker` 2.2 is open) | A | The creation form's field (generated by default, informed choice when emptied) and the join prompt are the same components; the content key derives from it as for a board | 2.4 |
| 13 | Join by code and approval ("knock") | ADR-0028; spec `room-access` "Join by code"; `useJoinByCode.ts`, `utils/join-code.ts`, `adapters/join-channel.ts`, `stores/join-host.ts` | None (`scrum-poker` 2.1 is open) | A | Same mechanism once the room is on the shared transport; the code is shown in the share dialog; the follow-up link is `/poker/room#` (ADR-0042 constraint) | 5.4 |
| 14 | Share panel: link, QR, templates, passcode copy, facilitator link card | `ShareDialog.vue`, `QrCode.vue`; spec `sharing` "One-gesture invite", "Invite templates", "QR join", "Facilitator link card" | `InviteSheet.vue`: link, QR, copy, share only | A | `ShareDialog` becomes kind-aware (the words, the poker link); `InviteSheet` is deleted (D4) | 3.3 |
| 15 | QR scan and the join field | `JoinScanner.vue`; landing join form; spec `board-session` "Join a board from the landing page" | A pasted poker link works (`index.vue`); no scan | R | The same field and scanner open a poker link; nothing new | 3.4 |
| 16 | Room confirmation words | `roomWords`, `room-words.ts`; spec `sharing` "Room confirmation words", "Explained room words" | None | R | Shown in the share dialog and at join, derived from the room id as for a board | 3.3 |
| 17 | Shield for the encryption state | `EncryptionBadge.vue`; spec `room-access` "Shield for encryption state" | None | R | In the room's bar | 5.5 |
| 18 | Move to a fresh link; remove a participant | ADR-0035; spec `room-access` "Move to a fresh link"; `transport/room-move.ts`, `RemoveDialog.vue` | None | A | Hide and remove are ledger events that already fold in a poker room; the move re-seeds the deck, the theme, the stories and the estimates in the new room, never an old ballot (a round in progress restarts); a design note in task 6.3 | 6.3 |
| 19 | Destroy the board | spec `board-lifecycle` "Destroy the board"; `DestroyDialog.vue`; command `board.destroy` | None | A | "Close the room" is the same command (in the shared allowlist, S4) and the same dialog with the room's words | 6.3 |
| 20 | Relay admission and caps | `LIMITS.maxConnections` 30; spec `platform-security` "Relay admission"; `docs/capacity.md` | Used; 20 voters inside the 30 connections (ADR-0042) | R | Nothing to do | - |
| 21 | Per-socket frame budgets and the client pacer | `packages/protocol/src/budgets.ts` `FRAME_MAX`, `PUB_PACE_MAX`, `FramePacer` | `PokerClient` pushes history in chunks of 100 with no pacer | A | The shared transport's `FramePacer` governs every send, including the batches of a story import (at most 50 stories and 16 KiB) | 5.1 |
| 22 | Signed snapshots | ADR-0037; `packages/application/src/sync/snapshot.ts` | Not used | N | About 1,200 events an hour replay in well under a second (ADR-0042); revisit if a room exceeds the relay buffer | - |
| 23 | Strict CSP, no cookies, no third party | spec `platform-security` "Strict content security policy"; AGENTS.md; ADR-0033 (the one Slack origin) | Respected (the card backs are gradients) | R | Nothing added; the glyphs of `poker-deck-studio` are paths; a CSP spec runs on the room | 8.4 |
| 24 | Telemetry-free | AGENTS.md "Things agents must not do"; `docs/PLAN.md` N6; `openspec/config.yaml`; spec `platform-security` "Content-free logs" | None | R | No analytics, tracker, cookie, remote font or beacon enters with any shared piece; "Suggest an idea" stays an outbound link (`FeedbackLinks.vue`, `ideaUrl`); checked in the gates | 8.4 |

### C. People

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 25 | Presence: who is here, direct or relayed, reconnecting | `stores/live.ts`, `ConnDot.vue`, `LiveMarkers.vue`, `connectionState`; specs `presence` "Ephemeral presence data", `board-session` "Presence list", "Connection state of participants" | Seats come from `seat.join`; nobody ever leaves | A | Presence frames from the shared transport: a dot on a seat (here, away, reconnecting), the count in the bar; a seat stays for a person who left and the voted mark stays with the ballot | 5.3 |
| 26 | Profile: name, avatar hue, language | `ProfileDialog.vue`, `ProfileButton.vue`, `stores/identity.ts`; spec `profile` "Local only", "Name shown by default" | Its own name step and `sessionStorage` `retroboard:poker:name`; the avatar hue is computed from the name | A | The identity store supplies the name and the hue; the step is skipped when a name is known and uses `NameDialog.vue` when not; `ProfileButton` sits in the bar | 5.3 |
| 27 | Avatars and persona sets | `utils/avatar.ts` `hueBg`, `peerHue`; `profile-avatars-and-team-space` | `nameHue(name)` | R | Seats draw the avatar with `peerHue` (the hue a person chose, broadcast on connect); persona sets arrive with their change | 5.3 |
| 28 | Duplicate names | spec `profile` "Duplicate names"; `NameConflict.vue`; `identity-conflicts` | Two seats can read the same | A | Two seats with one name get the same small rank as in `ParticipantsMenu`; seat names come from `ledger.selfNames` and `names` | 5.3 |
| 29 | Name nudge | `NameNudge.vue`; `shouldNudgeName` | - | N | The room asks for the name before entering (the name step), so a nudge has no moment | - |
| 30 | Rename, hide and remove a participant | spec `facilitation` "Rename a participant", "Hide a participant", "Remove a participant"; `ParticipantsMenu.vue`, `RenameDialog.vue`, `RemoveDialog.vue` | None in the UI | A | The role and participant events fold in any room (they are not board commands); the participants menu lists seats, observers first marked, with the same actions | 6.3 |
| 31 | Roles: facilitator, co-facilitator, hand over, take over | ADR-0005; spec `facilitation` "Delegation", "One lead facilitator", "Visible facilitator" | `moderator = ledger.facilitators.includes(author)`; crown icon | R | Already the same rule; the "Take over with the facilitator link" flow is the shared one; a moderator change in the middle of a round starts a new round (ADR-0042) | 6.3 |
| 32 | Everyone facilitates | ADR-0021; spec `facilitation` "Phase rules for everyone on open boards"; creation "Facilitation choice at creation" | One moderator, no switch | A | The creation form's `ToggleSwitch` ("Everyone moderates", off by default for a room) sets the shared `openFacilitation`; the round key still stays with whoever opens a round | 2.4 |
| 33 | Participant cap and "room full" | `LIMITS.maxConnections`; `board.roomFull`; spec `board-creation-v2` max participants | 21st voter is an observer; "The room is full" status | R | Nothing to do | - |

### D. Workspaces and storage

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 34 | Team workspaces: team and project of a room | ADR-0027; `stores/team.ts`, `TeamSwitcher.vue`; spec `team-space` "Boards belong to a team" | None | A | A room belongs to a team and a project (`team.assign`); the team's last theme and deck are the defaults; the team's list shows both kinds | 2.2, 3.1 |
| 35 | Team defaults and sharing a team | `TeamDefaults`; `TeamShare.vue`; `.retroteam` | None | R | The default deck and the saved decks of `poker-deck-studio` ride in the team record, so sharing a team shares them | 3.1 |
| 36 | Previous actions by team and carry-over | spec `team-space` "Previous actions by team"; `CarryOverPicker.vue` | None | A | The team's open actions are one source of stories for a room (7.1); the estimates a board keeps are carried with the action by `board-estimation-phase` | 7.1 |
| 37 | The board library | `stores/library.ts`, `LibraryList.vue`, `LibraryPage.vue`; `user-drive-storage` | A poker room is never listed | A | `LibraryEntry.kind` (`'poker'`, absent means a board), a kind label and icon, a filter (All, Retros, Estimations), open goes to `/poker/room#`, archive and forget unchanged | 3.1 |
| 38 | Recent boards and the boards menu | `stores/recents.ts`, `RecentBoards.vue`, `AppToolbar.vue` boards menu | A separate "Scrum Poker" line | A | One "New" with a kind; rooms appear in the recent list with their kind; the separate lines go (D7) | 3.2 |
| 39 | Vault sync and storage targets | `packages/sync/src/vault`, `stores/vault.ts`, `SyncSettings.vue`, `SyncShield.vue`, `SyncSheet.vue`; `user-drive-storage`, `sync-ux` | None | A | Library entries of rooms sync with the library; a room kept offline mirrors its events like a board's; the shield sits in the room's bar; the plaintext canary test gets a story title | 8.2 |
| 40 | Sealed vault file and team file | `.rbv` (`sync-ux`), `.retroteam`; `export-consolidation` door "My data" | None | R | Poker entries ride in the file with the library | 8.2 |
| 41 | Local replica and the local copy | specs `board-replication`, `board-session` "The local copy survives use"; `adapters/replica-idb.ts`, `replica-journal.ts`, `replica-session.ts` | None: the relay holds the history | A | A room's events are written to the replica like a board's, so a reload, offline and a relay restart keep the history and the person's own card; `retentionDays` applies | 5.2 |
| 42 | Drafts and sealed local storage | `stores/drafts.ts`, `adapters/sealed-storage.ts`, `adapters/device-key.ts`; `local-data-durability` | The voter's key and own card in `sessionStorage` in clear | A | Sealed with the device key (this also fixes a plaintext card at rest, which `scrum-poker` `design.md` says is sealed) | 5.2, 8.1 |
| 43 | Persistence status and the one-time file proposal | `stores/persistence.ts`; `local-data-durability` | None | A | The profile's "this device may clear boards" status covers rooms; a finished session proposes saving a file once | 8.1 |
| 44 | Retention and lifetime | `settings.retentionDays`; spec `board-session` "Board lifetime" | None | R | The same days apply to a room's copy | 5.2 |

### E. Creation, landing and public pages

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 45 | Landing page | `pages/index.vue`; ADR-0038; spec `landing` | A third action and a nav entry | A | The hero offers one choice, Retro or Estimation (S3); it stays prerendered; the nav entry goes | 2.1 |
| 46 | Creation page and form | `pages/new.vue`, `BoardSetupForm.vue`; specs `board-session` "Board creation from setup", "Simple creation" | `/poker` on its own | A | A `kind` in the form (S3); the estimation takes title, theme, passcode, team and project, mode; the deck gallery replaces the format picker | 2.2 |
| 47 | Simple and advanced mode | `ModeSwitch.vue`, `settings.uiMode`; specs `profile` "Simple or advanced mode", `board-session` "Board options follow the interface mode" | None | A | Simple: deck and title (and team). Advanced: passcode generator, theme, moderation choice, voter cap, project | 2.2 |
| 48 | Smart title | `utils/next-title.ts`; spec `board-session` "Next retro title suggestion" | None | A | The same counter proposes "Sprint 14 estimation" (the series title with the kind) | 2.2 |
| 49 | Quick start | spec `board-session` "Simple creation"; `/poker` "one press" | One press | A | Kept: "Start an estimation" with the team's defaults, from the landing and from `/poker` | 2.3 |
| 50 | Public format pages and search | `FormatPage.vue`, `pages/formats`; `public-launch`; `scrum-poker` 7.1 | `/poker` noindex, no page | A | The public `/poker` page uses the `FormatPage` shell and links to `/new?kind=poker` | 2.3 |
| 51 | Retro formats and templates | `retro-templates`; `TemplatePicker.vue`, `TemplateCard.vue`; `catalogue/templates.ts` | - | N | Columns and phases are retro structure; the counterpart of the format picker in an estimation is the deck gallery of `poker-deck-studio`, in the same place of the form | - |
| 52 | Agenda, phases and the stepper | `timeboxed-agenda`; `PhaseStepper.vue`, `AgendaRing.vue`; `phase-controls` | - | N | A standalone room has rounds, not phases; the phase machine is where a board runs an estimation (`board-estimation-phase`) | - |
| 53 | Solo mode | spec `board-session` "Solo mode"; ADR-0026; `utils/solo.ts`, `local-relay.ts` | - | N | An estimation needs other people; alone, the room shows the invite seat (`poker-design-v2`). A practice room is possible later | - |
| 54 | Clone a board; calendar agenda import | `utils/clone.ts`; `calendar-agenda-import` | - | N | A new room from the team's defaults is one press, and a room has no agenda | - |

### F. Room tools

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 55 | Chat | `ChatPanel.vue`, `stores/chat.ts`, commands `chat.post`, `chat.clear`; specs `board-chat`, `chat`; changes `chat-floating-dock`, `chat-message-controls` | None | A | The shared allowlist folds `chat.*` in a poker room (S4); the chat dock opens above the hand on a phone | 6.1 |
| 56 | Reactions | `chat-message-controls` names reactions as out of scope; `scrum-poker` 5.2 emoji throws | None | N | RetroBoard has no reactions feature to reuse; the emoji throws of `scrum-poker` 5.2 stay live frames within 60 per 10 seconds per socket | - |
| 57 | Timer and activity rings | `TimerWidget.vue`, `ActivityRings.vue`; spec `timer` "Shared countdown"; commands `timer.*` | None | A | One timer per room (the shared allowlist), used for the countdown before the reveal (`scrum-poker` 3.3) and for a break, which replaces the coffee card | 6.2 |
| 58 | Talk time and the speaking turn | `TalkBanner.vue`, `TurnBar.vue`; spec `talk-time`; commands `talk.*`; `facilitation/talk.ts` | None | A | "Please explain" for the highest and lowest voters of a revealed round is a `talk.assign` to them (`scrum-poker` 3.2) | 6.2 |
| 59 | Reveal countdown | `RevealCountdown.vue`; `drafts.reveal` | - | A | The visual of the auto-reveal countdown of `scrum-poker` 3.3 | 6.2 |
| 60 | Presenter and TV mode | `PresenterJoin.vue`, `presenter.set`, `settings.presenterHideMenus`; `packages/themes/src/screens.ts`, `--type-scale`; spec `presentation` | The type scale on wide and TV (`poker-design-v2` K8) | A | Add `presenter.set` ("started presenting" is announced), the hide-menus behaviour and the join QR in the middle of the table; column focus, note spotlight and the walk-through are N (no columns or notes) | 6.4 |
| 61 | Activity feed and arrival toasts | `ActivityFeed.vue`, `stores/activity.ts`, `announceArrivals`; spec `facilitation` "Activity feed" | None | A | Poker events (joined, left, round revealed, estimate set) in the same feed; the same arrival toast setting | 6.1 |
| 62 | Toasts and popups | `ToastHost.vue`, `useToasts.ts`, `usePopupSlot.ts`; spec `notifications` | Inline notices on the room page | R | The poker pages use `useToasts` for confirmations and the popup slot for time-up, not their own notices | 6.5 |
| 63 | Attention and notifications | `attention-and-notifications`; `utils/system-notify.ts`, `PhaseEndPopup.vue`; ADR-0023 | None | A | The categories gain "a round opened and you have not voted" and "the moderator revealed"; the favicon dot is the main use; nothing is pushed by a server | 6.4 |
| 64 | Live announcements | `useLiveAnnouncer.ts`, `LiveRegions.vue`; spec `accessibility` "Status announcements" | Its own `role="status"` region in `room.vue` | R | The room uses the shared announcer (D9) | 6.5 |
| 65 | Sound | `utils/sound.ts`, `settings.sound` | None | R | The reveal chime uses the existing setting, off by default (`scrum-poker` design) | 6.4 |
| 66 | Keyboard shortcuts, help and the palette | `useShortcuts.ts`, `ShortcutsDialog.vue`, `packages/application/src/keyboard/shortcuts.ts`, `PaletteDialog.vue`; spec `keyboard` | The typed names of cards only | A | A poker context in the same table (`R` reveal, `N` next round, `V` vote again, and the existing `share.open`, `export.open`, `help.open`); the typed card names stay in the hand; the help dialog lists them | 6.4 |
| 67 | History, undo and rewind | spec `board-history`; `HistoryPanel.vue`, `useUndo.ts`, `board/history-log.ts` | - | N | A card is replaced until the reveal and a revealed round is a fact; Vote again is the way back | - |
| 68 | The round history of a session | `.panel-row` list pattern of `HistoryPanel`, `ParticipantsMenu`, `ActivityFeed`; `scrum-poker` 4.2 | None | A | The summary of rounds and estimates is a panel in the same pattern (`Dropdown` with `--panel-w`) | 6.5 |

### G. Board features without a poker counterpart

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 69 | Notes, clusters, columns, post-its | specs `notes`, `grouping`, `columns`, `board-layout`; `NoteCard.vue`, `BoardColumn.vue`, `GroupCard.vue` | - | N | A room's items are a list; notes are a source of stories (7.1) and, on a board, the items of the phase (`board-estimation-phase`) | - |
| 70 | Dot voting, up and down votes, ranking | spec `voting`, `up-down-votes`; `VoteBar.vue`, `RankingDialog.vue` | - | N | A card is not a vote budget; the sealed-ballot primitives (HKDF, X25519, AES-GCM) are already shared at the crypto layer (ADR-0042 finding 2) | - |
| 71 | ROTI vote | `RotiVote.vue`; command `roti.set` | - | N | A retro's closing ritual; the Confidence deck gives any room the same 1 to 5 sealed poll | - |
| 72 | Cursors and live pointers | spec `presence` "Live cursors"; `CursorLayer.vue`; `cursors-off-for-now` | - | N | Paused product-wide and there is no canvas on a table | - |
| 73 | Actions and tracking | spec `action-tracking`; `ActionsDrawer.vue`; commands `action.*` | - | N | In a room an "action" is the estimate of a story; on a board an action can be an item of the phase (`board-estimation-phase`) | - |

### H. Outputs

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 74 | The export hub | spec `export`; `ExportDialog.vue`, `ExportMenu.vue`, `utils/export.ts`, `packages/exporters`; `export-hub`, `export-consolidation`, `export-destinations-v2` | None | A | Kind-aware sections and a door in the room's bar (S8) | 4.2 |
| 75 | The retro report and its encrypted variant | spec `retro-report`; `ReportDialog.vue`, `ReportView.vue`, `report-html.ts`, `report-encrypted.ts` | - | A | An estimation report in the same shell and the same encrypted variant (S8) | 4.3 |
| 76 | Destinations: Jira, Confluence, Google, Slack, agents | `packages/exporters/src/destinations.ts`; `utils/slack-webhook.ts`; ADR-0007, ADR-0033; `jira-estimation-import` 3.1 | - | A | The same destinations for a session; "Copy for Jira" is the CSV of `jira-estimation-import`; Slack posts the session message to the same webhook | 4.1, 4.2 |

### I. Integrations and agents

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 77 | Browser agents (WebMCP) and the MCP server | ADR-0016, ADR-0013; `adapters/webmcp.ts`, `useBrowserAgents.ts`; spec `browser-agent-tools`; `browserAgentsAllowed` | - | N | A tool that reads the room could read a card early on the moderator's device; no poker tool and no setting in the first release | - |
| 78 | Local AI companions | ADR-0012; `local-ai-companion`, `funny-local-companion` | - | N | Out of scope; AI estimates are out of scope of `scrum-poker` | - |
| 79 | Jira and board imports | `jira-estimation-import`; `note.addMany`, `action.import` | - | A | The stories list of a room takes the same parsed rows; the board side is `board-estimation-phase` | 7.1 |

### J. Language, access, quality and the rest

| # | Feature | Where it lives | Poker today | Verdict | What changes, or why not | Task |
|---|---|---|---|---|---|---|
| 80 | French and English, the pseudo-locale | ADR-0014; `packages/i18n` (`td`, `translatePseudo`); `apps/web/app/i18n`; spec `i18n` | `apps/web/app/poker/strings.ts` with its own `pt()` | A | Strings stay in a lazy file (ADR-0044) but load through one shared loader and `pt` is the shared `td` over the lazy dictionary, pseudo included | 8.3 |
| 81 | Accessibility | ADR-0022; spec `accessibility`; `docs/accessibility.md`; axe in `tests/e2e/helpers.ts` | Gated since `poker-design-v2` | R | Same gates over the new surfaces | 8.4 |
| 82 | Responsive layouts and device classes | spec `responsive-layout`, `mobile-board`; `data-screen`; `screens.ts` | `useMedia` re-implements a media query | R | The room reads `data-screen` and the layout store (D8) | 5.5 |
| 83 | Onboarding: guide, tour, what's new, nudges | `GuideLink.vue`, `docs/user-guide/en/poker.md`, `tests/docs/manifest.ts`, `WhatsNewPage.vue`, `SyncNudge.vue`; spec `user-documentation` | A chapter | A | `GuideLink` in the room's menu; the manifest extended for the new flow; a "what's new" entry; the sync nudge after creating a room | 8.3 |
| 84 | Service pages and privacy text | spec `service-pages`, `accessibility` "Accessibility statement"; `pages/privacy.vue` | None | A | The privacy page names the room: names, stories and cards are encrypted and kept in browsers | 8.3 |
| 85 | Self-hosting and the Node relay | spec `self-hosting`; `apps/relay` | Kind-agnostic | R | Nothing to do | - |
| 86 | Offline and unsupported-browser pages | `pages/offline.vue`, `pages/unsupported.vue` | - | R | The poker chunks load lazily like the board's; checked in the gates | 8.4 |
| 87 | Beta tag and feedback links | `BetaTag.vue`, `FeedbackLinks.vue` | Used | R | Kept until the owner promotes the feature | - |
| 88 | Short links and the join landing | `short-links-and-join`; spec `sharing` "Short board links" | - | R | The compact fragment is already the poker link's form | - |
| 89 | Mode parity and ui coherence checks | specs `ui-coherence`, `ux-calm`, `ux-irritants`; `design-tokens.test.ts` | Gated | R | The token and button-icon guards apply to every new poker surface | 8.4 |

### Counts

89 features in 10 areas (A to J): 30 reused as they are (`R`), 44 reused with a named adaptation (`A`) and 15 not applicable (`N`) with their reasons. A test of task 8.4 parses this table and checks these counts, the numbering and that every task named in a row exists in `tasks.md`, so that a row cannot be added or changed without the count.

## Shared components reused

Every existing component, class, store or composable the integration relies on, by name. A name appears once here and in the rows or wireframes that use it; the "new" list after it is what this change builds.

| Group | Reused by name |
|---|---|
| Pages and shells | `pages/index.vue` (the landing), `pages/new.vue`, `BoardSetupForm.vue`, `pages/boards.vue`, `LibraryPage.vue`, `LibraryList.vue`, `RecentBoards.vue`, `FormatPage.vue`, `LegalLinks.vue` |
| Bars, menus, dialogs | `AppToolbar.vue` (the tool set by kind), `Dropdown.vue`, `BaseDialog.vue`, `ConfirmDialog.vue`, `OptionsDialog.vue`, `ShareDialog.vue`, `ExportDialog.vue`, `ExportMenu.vue`, `ReportDialog.vue`, `ReportView.vue`, `ProfileDialog.vue`, `NameDialog.vue`, `PasscodeDialog.vue`, `RemoveDialog.vue`, `RenameDialog.vue`, `DestroyDialog.vue`, `ShortcutsDialog.vue`, `PaletteDialog.vue` |
| Controls | `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.mini-btn`, `.icon-btn`, `.chip`, `.pick-seg`, `.seg`, `.field`, `ToggleSwitch.vue`, `ModeSwitch.vue`, `ThemePicker.vue`, `PasscodeField.vue`, `LocaleSwitch.vue`, `ProfileButton.vue`, `TeamSwitcher.vue` |
| Status and feedback | `ConnDot.vue`, `EncryptionBadge.vue`, `SyncShield.vue`, `SyncSheet.vue`, `SyncNudge.vue`, `ToastHost.vue`, `LiveRegions.vue`, `BetaTag.vue`, `GuideLink.vue`, `FeedbackLinks.vue`, `Icon` (Lucide) |
| Room tools | `ChatPanel.vue`, `TimerWidget.vue`, `ActivityRings.vue`, `TalkBanner.vue`, `TurnBar.vue`, `RevealCountdown.vue`, `ActivityFeed.vue`, `ParticipantsMenu.vue`, `PresenterJoin.vue`, `AmbientLayer.vue`, `PhaseEndPopup.vue` |
| Data display | `ChartBars.vue`, `ChartGauge.vue`, `QrCode.vue`, `JoinScanner.vue`, the `.panel-row` and `.panel-empty` list pattern |
| Stores and composables | `useThemeStore`, `useSettingsStore`, `useIdentityStore`, `useTeamStore`, `useLibraryStore`, `useRecentsStore`, `useVaultStore`, `usePersistenceStore`, `useBoardStore` (the session), `useLiveStore`, `useLayoutStore`, `useToasts`, `usePopupSlot`, `useLiveAnnouncer`, `useShortcuts`, `useJoinByCode`, `useTouchDrag` |
| Pure code | `@retroboard/themes`, `@retroboard/i18n` (`td`, `translatePseudo`), `@retroboard/exporters`, `packages/application` (`team/workspace`, `storage/library`, `keyboard/shortcuts`), `packages/protocol` (`FramePacer`, `budgets`) |

New surfaces of this change: the kind choice on the landing (a `.pick-seg` pair, built from the existing class), the kind-aware parts of the shared dialogs, the session exporters, and no other visual component. The cards, the gallery and the builder are `poker-deck-studio`'s; the table, hand, dock and results are `poker-design-v2`'s and are moved onto the shared parts below.

## Duplicated in the poker code (removal tasks)

Everything the poker code built instead of reusing, with the file, what replaces it and the task that deletes it. Each deletion lands in the same pull request as the replacement, with its tests.

| # | Duplicate (file) | What it duplicates | Replaced by | Task |
|---|---|---|---|---|
| D1 | `apps/web/app/poker/client.ts` `PokerClient`: connect, retry, heartbeat, history, re-upload after a relay restart, push chunks | The board transport: `transport/encrypted.ts`, `backoff.ts`, `mesh.ts`, `replica-session.ts`, `deploy-safe-sessions` | The shared transport sending a `PokerBody`; the poker view model stays | 5.1, 5.2 |
| D2 | `apps/web/app/poker/strings.ts` `pt()`, its own loader and its own `{name}` filling | `td`, `translatePseudo` of `@retroboard/i18n` | One lazy loader over the shared functions | 8.3 |
| D3 | `PokerMenu.vue`: language items, light-or-dark item, `document.documentElement.dataset.variant` | `LocaleSwitch.vue`, the toolbar's variant control, `useThemeStore.variant` | The shared toolbar items | 5.5 |
| D4 | `InviteSheet.vue`: link, QR, copy, share | `ShareDialog.vue`, `QrCode.vue` | `ShareDialog` kind-aware | 3.3 |
| D5 | `PokerBar.vue`, `RoomBar.vue`, `PokerStep.vue`: own bars and a page shell | `AppToolbar.vue` (a tool set by kind), the product page shell of `new.vue` (`.top`, `.wrap`, `.card .panel`) | The toolbar's room tool set and the product shell | 5.5, 2.3 |
| D6 | The name step in `room.vue` and `sessionStorage` `retroboard:poker:name` | `NameDialog.vue`, `stores/identity.ts`, event `participant.self` | The identity store; the dialog only when no name is known | 5.3 |
| D7 | Three entry buttons: landing hero, `boards-poker` in `AppToolbar.vue`, `library-poker` in `LibraryPage.vue`, plus `nav-poker` in the landing header | One creation flow | The kind choice and one "New" | 2.1, 3.2 |
| D8 | `apps/web/app/poker/media.ts` `useMedia` | `useLayoutStore` and `data-screen` | The layout store; the one `@supports` check for the oval stays as a CSS rule | 5.5 |
| D9 | `room.vue` `role="status"` region and `announcement` | `useLiveAnnouncer.ts`, `LiveRegions.vue` | The shared announcer | 6.5 |
| D10 | `sessionStorage` slots `retroboard:poker:deck:<room>`, `...:hue:<room>` (a hand-off from the start page) | The `retroboard:init:<roomId>` hand-off of `new.vue` | The same hand-off | 2.3 |
| D11 | `sessionStorage` slots `retroboard:poker:key:<room>` and `...:card:<room>`, in clear | `adapters/device-key.ts`, `adapters/sealed-storage.ts` | Sealed storage (this also closes a plaintext vote at rest) | 5.2 |
| D12 | `CardDistribution.vue` | `ChartBars.vue` | `ChartBars` with a small slot for the card as the label (an adaptation of `ChartBars`, not a new chart) | 6.5 |
| D13 | `ConsensusMeter.vue` | `ChartGauge.vue` | `ChartGauge` with the verdict as its caption | 6.5 |
| D14 | `PokerResults.vue`, `PokerDock.vue`, the room's local panel and notice CSS (`.panel`, `.notice`, `.act`) | `.card .panel`, `.btn`, the popup slot and toasts | The shared classes; the dock keeps its layout only | 6.5 |
| D15 | The plain-cards setting kept in its own `localStorage` key (`poker-deck-studio` 1.4) | `useSettingsStore` | Moved into `LocalSettings` once the entry budget is reviewed | 8.3 |

## Decisions

### S1. One product: what a person recognises

The bar of a room is the product's toolbar with the tools that mean something for an estimation, in the product's order ("invite (share), participants, filter, presenter, export, activity, options, light/dark, profile" of `docs/design-system.md` section 3): Share, Participants, Timer, Chat, Presenter, Export, Activity, Options (the theme, the deck, the moderation switch, the voter cap, "Close the room"), light or dark, profile; the connection dot, the encryption shield and the sync shield sit where the board has them. On a phone the room keeps its one-viewport layout (`poker-design-v2`) and the tools that do not fit go to the toolbar's overflow, as the board's do. The dialogs, menus, toasts, empty states and buttons are the product's; the room adds the table, the hand, the dock and the results (poker-design-v2's, built on the product's tokens) and the cards and decks (`poker-deck-studio`'s).

### S2. Theme parity

- **The command.** `room.theme { themeId }`, a new tag of the poker command schema, written by the moderator (a lead or a co-facilitator); applied from the next event on every replica; folded into `PokerState.themeId` (absent or unknown means the default theme, as `board.settings.themeId` does). A client that does not know the tag keeps and forwards it and shows its own device theme; nothing breaks (the rule ADR-0042 already states for unknown tags). It is separate from `settings.update` for the reason `poker-deck-studio` S10 gives: a strict object would be refused whole by an older client.
- **The application.** The room page calls `useThemeStore().use(themeId)` when the state has one and keeps `settings.variant` personal; the theme the device chose is restored when the person leaves the room, as it is when leaving a board.
- **Who chooses, when.** At creation (the form's `ThemePicker`, prefilled from the team's last theme and the season, as for a board) and later from the room's Options; a participant sees the picker read-only with the line "Only the moderator can change the theme", the board's wording.
- **Product pages.** The landing, creation, library, start and name steps use the product design and no room theme.
- **Cards.** The card skins of `poker-deck-studio` follow the room theme; the hue of "Card colours" still wins on the back.

### S3. One creation flow and one landing

```
Landing, phone and desktop (hero actions)
+----------------------------------------------+
|  Retros people look forward to.        [E] h1 |
|  ( Retro | Estimation )              [N] .pick-seg pair, [E] class |
|  [ Start a retro  -> ]                 [E] .cta (follows the choice) |
|  Try it solo      (Retro only)         [E] .ghost |
|  [ Paste a link or type a code ] [Join] [E] join form |
+----------------------------------------------+
```

- **The choice.** A `.pick-seg` pair (the class `ModeSwitch.vue` uses) above the one filled call to action: "Retro" (the default, so the prerendered page is unchanged for search and for a first paint) and "Estimation". The call to action follows the choice ("Start a retro", "Start an estimation") and goes to `/new` or `/new?kind=poker`; "Try it solo" is shown for a retro only (row 53). The ghost "Scrum Poker" button, the header navigation entry, the boards-menu line and the library button go (D7); the Beta tag stays on "Estimation" until the owner promotes it. The choice is remembered per device (`localStorage`, one key, a personal preference like the mode) and the landing is still prerendered (ADR-0038).

```
/new, phone (390 px) with kind = Estimation
+--------------------------------------+
| (<) RetroBoard                  (me) |  [E] .top, ProfileButton
|                                      |
|  New estimation                      |  [E] h1
|  ( Retro | Estimation )              |  [N] .pick-seg pair
|  ( Simple | Advanced )               |  [E] ModeSwitch
|  +--------------------------------+  |  [E] .card .panel
|  | Title      [Sprint 14 estimation]|  |  [E] .field, smart title
|  | Team       [ Platform  v ] [+]   |  |  [E] TeamSwitcher / select
|  | Deck                             |  |  [N] DeckGallery (poker-deck-studio)
|  |   {fan}  Fibonacci     (change)  |  |
|  | Theme      [ Studio  v ]         |  |  [E] ThemePicker (advanced)
|  | Passcode   [ ******** ] (regen)  |  |  [E] PasscodeField
|  | [x] Everyone moderates           |  |  [E] ToggleSwitch (advanced)
|  +--------------------------------+  |
+--------------------------------------+
|  [ (play) Start the estimation ]     |  [E] .btn .btn-primary, fixed foot
+--------------------------------------+
```

- **The form.** `new.vue` and `BoardSetupForm.vue` get a `kind`. An estimation shows the title (the smart title, row 48), the team and project (first, as `creation-team-first` puts them), the deck gallery in place of the format picker and the agenda editor, the theme, the passcode (advanced shows the generator), "Everyone moderates" (advanced; off) and the voter cap (advanced). Simple shows the title, the team and the deck; the theme and the passcode take the team's last theme and a generated passcode, so one press still starts a room.
- **The result.** The same code path as a board: the key ring is made in the tab, the setup goes in the `retroboard:init:<roomId>` hand-off (D10), the passcode in the device vault, the library entry is written while the room opens, and the page is `/poker/room#...`. The moderator's tab writes the genesis, `room.theme`, `settings.update` (the deck), `deck.style` and the first round, in that order.
- **`/poker`.** Stays as the public page of `scrum-poker` 7.1 (built on `FormatPage.vue`) and as the one-press shortcut: "Start an estimation" creates a room with the team's defaults without showing the form; the deck choice and the rest are changed in the room's Options.

### S4. The same session underneath, and the room tools

The room runs on the board session: `useBoardStore` (the session store), the transport (`transport/encrypted.ts`, `mesh.ts`), the replica and the live presence, with a send that takes any event body (`scrum-poker` 2.1). The ledger already holds both a `board` and a `poker` field and shares the access rules (genesis, roles, hide, remove, names, rate window); the content rule today is "a poker room folds only poker bodies and a board folds only commands".

**The shared allowlist.** The fold accepts, in a poker room as in a board, a short list of command types that are room tools and not board content: `chat.post`, `chat.clear`, `timer.start`, `timer.pause`, `timer.reset`, `talk.assign`, `talk.end`, `talk.self`, `talk.done`, `presenter.set`, `settings.update` (read only for `openFacilitation`, `announceArrivals`, `talkMode`, `talkBudgetMs`, `talkSelfStart`) and `board.destroy`. They fold with the board reducer into `Ledger.board`, which a poker room already has and keeps empty of columns and notes, so `Snapshot` fields `chat`, `timer`, `talk`, `presenting` are populated and `ChatPanel`, `TimerWidget`, `TalkBanner` and `PresenterJoin` work unchanged. The privileges are the board's: `timer.*`, `talk.assign` and `chat.clear` are privileged (the moderator, or everybody when "Everyone moderates" is on), `chat.post`, `talk.self` and `presenter.set` are anyone's. Any other board command in a poker room is still ignored, and any poker body in a board is still ignored (until `board-estimation-phase` allows it during its phase). This refines the content rule of ADR-0042 without reversing its decision (the kind is in the genesis, estimation is its own bounded context, the relay is kind-agnostic); a new ADR records the list, written with task 6.1.

**What the room adds to the tools.** The shared timer is the room's countdown and its break (the "Take 5" that replaces the coffee card); the talk turn is "please explain" for outliers; the activity feed lists joined, left, revealed and estimate-set events; a seat's presence dot comes from the live store. None of this adds a protocol message: each is an existing command or a live frame.

### S5. Library, menus, share and join

```
Library (the person's boards and rooms)                 [E] LibraryPage, LibraryList
+----------------------------------------------------------+
| Library                          [ + New ]  [ Home ]     |  [E] .btn .btn-primary
| ( All | Retros | Estimations )                           |  [N] one more .seg filter in LibraryList
| (board) Sprint 14 retro      Platform  facilitator  2 h  |  [E] row
| (spade) Sprint 14 estimation Platform  moderator  Beta   |  [E] row, [N] kind icon and label
+----------------------------------------------------------+
```

- **Entries.** `LibraryEntry.kind?: 'poker'` (absent is a board), written when the room opens; the row shows a kind icon and label, the team, the role (facilitator or moderator), the last activity and the same actions (open, archive, forget). `useLibraryStore.open` hands a poker entry to `/poker/room#`. The vault carries the field as an optional string; an older reader ignores it and lists the entry as a board that opens the link, whose page hands the same fragment to the poker room (ADR-0044), so nothing is lost.
- **Menus.** The boards menu and the library page have one "New" that asks for the kind (or the landing's choice); the separate poker lines go (D7). The recent list shows rooms with their icon.
- **Share.** `ShareDialog.vue` is the share panel of both kinds: the same sections (link, QR, templates by chat or e-mail, passcode copy, the short code with its approval prompt, the moderator link card, the confirmation words), with the room's wording and the `/poker/room#` link; `InviteSheet` is deleted. The bar's Invite button, the lobby's filled button and the ghost seat open it.
- **Join.** The landing field accepts a poker link or a short code; the scanner opens a poker link; a pasted `/poker/room#` goes to the room (already true); the joiner of a code follows the sealed link to `/poker/room#` (ADR-0042 constraint, in task 5.4).

### S6. People, presence and moderation

The seat is the product's participant: the identity store's name and hue (`peerHue`) in the avatar, a connection dot from `connectionState`, the crown for the moderator, the duplicate-name rank, rename, hide and remove from `ParticipantsMenu`, observers marked. The name step goes: a person whose identity store has a name enters and the seat is written from it; a person without one is asked by `NameDialog` (D6). The ledger's `participant.self` and `participant.rename` events name seats; the poker `seat.join` keeps only the voter-or-observer registration (its `name` field is read for rooms made before this change).

### S7. Retro and estimation

This change does not build the link between a retro and an estimation; `board-estimation-phase` does, as a phase of the board. What this change adds is the part on the room's side, after the first tasks of that change exist:

- **Import stories from a board into a room.** The moderator's "Add stories" offers "From a retro": a picker over the library's boards (`useLibraryStore`, the `CarryOverPicker.vue` pattern) lists a board's open actions and its notes by column; the person selects, a preview shows the rows, and the stories are added in batch events (at most 50 stories and 16 KiB each, paced by `FramePacer`). The board's replica is read on this device only; nothing is sent to the board.
- **Estimate an action or a note.** The row menu of an action and the menu of a note get "Estimate", which starts the phase of `board-estimation-phase` for that item; "Estimate in a room instead" creates a room seeded with the item, for people who are not on the board.
- **Send estimates back to a board.** From a room started from a board, "Send estimates to the retro" hands the decided estimates to the board's estimates map (`board-estimation-phase`) through the sealed device hand-off and the board page that applies it on arrival, and "Back to the retro" is a link in the room's menu. A board that cannot accept them (the person lacks the right, or the board is closed) says so and offers the export instead.

### S8. Export

A poker session leaves through the same three doors as a board (`export-consolidation`: Export, My data, Share), with the same save path, file names (`<name>-<date>.<ext>`), icons and messages:

| Format or destination | A poker session |
|---|---|
| Markdown, copy as Markdown | Title, date, deck, one section per story: the estimate, the rounds to consensus, the verdict in words; the total |
| CSV | A layout Jira's CSV import accepts: `Issue key, Summary, <estimate field>, Rounds, Consensus`; keys recognised in the story text, rows without a key kept with an empty key and a note, the estimate field name set once (Story Points by default) |
| JSON | The documented schema of `export-hub`, with a `kind: "poker"` section: stories, rounds (deck, who voted, the verdict), estimates |
| Confluence, Google Docs and Sheets | The same table as rich HTML on the clipboard and as TSV |
| Slack | A formatted message to the user's incoming webhook (ADR-0033) |
| Agents | The JSON and Markdown bundle with a prompt header |
| The estimation report (HTML and its encrypted variant) | The shell of `ReportView.vue`: the estimates table, the rounds-to-consensus trend, the consensus verdicts, the stories parked or to split, participation (a count, not names) |
| "Estimates only" | The filter that takes the place of "actions only": only decided stories |

**What poker adds.** The unit is the story, not the note or the action; the content is the estimate, the rounds it took and the verdict. **Per-voter cards are not exported unless the person asks**: every participant saw them at the reveal, but a file travels further than a room, so the default is the room's decision and "Include who voted what" is an explicit switch (off), with the same wording as the report's participation metrics. The writers are pure functions in `packages/exporters` with snapshot tests; the dialogs are the existing ones.

### S9. Durability, sync and docs

A room is a library entry and its events are written to the replica, so the persistence status of the profile, the one-time "save a file" proposal after a finished session, the sealed vault and the sync shield cover it. The own-card storage is sealed (row 42). The guide chapter, the tour manifest, the "what's new" entry and the privacy page are updated in the pull request that changes the behaviour (AGENTS.md).

## What this replaces once it is implemented

This change is an additive follow-up: it does not rewrite the text of `poker-design-v2` or `scrum-poker`. When a task is implemented, its pull request amends the older text it replaces, listed here so that nobody reads it as current after that (task 8.4 checks none is left):

| Older text | Replaced by this change's task |
|---|---|
| `poker-design-v2` K5 and its `InviteSheet`, requirement "Invite in a sheet, never in the page" (the sheet component) | The shared `ShareDialog` (3.3); the requirement's behaviour (nothing printed, copy without showing, focus back) is kept |
| `poker-design-v2` K6 overflow menu (language, light or dark, back), D23 | The shared toolbar's items (5.5) |
| `poker-design-v2` K7 distribution columns and consensus meter components | `ChartBars` and `ChartGauge` with the same text alternatives (6.5) |
| `poker-design-v2` K10 start page and name step as pages of their own | The creation flow and the identity store (2.2, 2.3, 5.3) |
| `poker-design-v2` K11 "all of it is component CSS on tokens; no theme file changes" | Stays; the room theme is a command, not a theme file (1.2) |
| `scrum-poker` proposal "Library and sync", task 2.1 "to do" (short code, shared transport, library entry) | Groups 3 and 5 |
| `scrum-poker` task 2.2 (passcode, "everyone moderates") | 2.4 |
| `scrum-poker` tasks 6.1, 6.2 (export, library entries that sync) | Groups 4 and 8 (the same behaviour, delivered through the shared parts) |
| `scrum-poker` design "Creative extras" (sound, emoji throws) | Unchanged; the sound uses the shared setting (6.4) |

## Budgets

- **Relay and free plan.** No new kind of traffic. A room on the shared session sends the presence frames a board sends (the join cost is the term that grows with the square of the room, already counted: 210 presence messages for 20 people, ADR-0042 finding 3), chat messages and timer events at a board's rates (the load test of `docs/capacity.md`: about 6 events a person a minute at the retro's worst case, so a 20-person room is far under the 80 frames per 10 seconds a socket may send), `room.theme` once and one live frame per presence update. A 20-voter hour stays about 1,170 poker events plus chat; the worst-case billed requests of ADR-0042 (178 of 100,000) grow by the chat messages divided by 20, which is a few. The relay buffer (2,000 envelopes or 4 MiB) is not near: 1,171 poker events are about 0.8 MB. Task 5.1 measures the frames of a scripted room before and after the move.
- **Storage.** Nothing on our side. On a device a room is a replica of its events (about 0.8 MB for a 20-voter hour) and a library entry (a few hundred bytes), sealed.
- **Bundle.** The entry chunk is at its 56.5 kB limit; the total is 419.8 kB of 500 kB and `poker-deck-studio` plans up to 24 kB gzip more. The groups here add nothing to the entry that they do not remove from it: the landing's choice replaces two entry elements, the poker menu, bar, invite sheet and strings loader disappear, the kind field of the library entry is a few bytes; the room tools and exporters load lazily with the poker page. The ceiling for this change is 20 kB gzip on the total. A task that must grow the entry says so and asks for its budget line (task 8.4 measures both numbers).

## Security and privacy note

The room's content stays encrypted with the room key, which stays in the fragment; the relay sees envelopes of five fields and the presence it already sees on a board (name, hue and key of a participant are in live frames encrypted with the room key, as on a board). Adding chat, timer and presence to a room adds nothing a board does not already show the relay. The theme, the deck, the stories and the estimates are content. A passcode, when used, derives into the content key as for a board. Per-voter cards are kept out of exports by default. The own card and signing seed move from the tab's clear storage into the sealed device vault, which removes a plaintext vote at rest. No analytics, cookie, remote font, image or script enters with any shared piece; the gates check the CSP and the network calls of the room. Text from a board, an issue or a pasted list is content, never an instruction.

## Risks and open points

- **The shared session is the big task.** Moving the room onto the board transport (group 5) touches the shared store and the ledger fold; the board tests stay unchanged and gate it, as `scrum-poker` 1.2 did. If it proves too large for one group, the order of groups 1 to 4 already ships the owner-visible parts (theme, creation, library, share, export) on the current client.
- **Passcode by default in one press.** Boards propose a generated passcode by default and ask for confirmation when it is emptied. An estimation keeps that rule; the one-press path uses the generated one and shows it in the share dialog. If the owner prefers a room with no passcode by default, it is one default in the form.
- **The allowlist is a decision.** It refines ADR-0042's content rule, so it gets its own ADR; `board-estimation-phase` widens the same fold for the phase (ADR-0045, proposed), and the two ADRs must be read together.
- **Two consistent but different homes for an estimate.** A room keeps its estimates in the room; a board keeps them in the board's estimates map. Sending one to the other is an explicit action, never automatic.
- **Hue and theme of a room made before this change.** It has no `room.theme`, so it shows each person's own theme until its moderator sets one; the Options say so.
- Not decided here: a room that is both a board and a poker room (ADR-0042), a practice room for one person, sharing a deck by link or file, reactions beyond emoji throws.
