# Proposal

## Why

Owner note (2026-11-20): "An option to publish to everyone in a popup who published and how many ideas, e.g. 'Alex published 4 ideas to Wish List'; gratis, not heavy UX/UI, maybe combined with activity; ON/OFF in board creation with a choice to enable by default; it is a broadcast."

Publishing turns private drafts into ideas everybody sees, and in a live retro nobody notices it happen: the facilitator cannot tell who has contributed, and participants cannot tell the board just got richer unless they look at the right column. The product already announces arrivals (`announceArrivals`, a board setting chosen at creation, listed in the activity feed), so the same quiet pattern applies to publishing.

## What Changes

- **A broadcast line when someone publishes.** When a participant publishes drafts, every device shows one small toast, "Alex published 4 ideas to Wish List", naming the author (by the same display rule as notes, so "Someone" when the author is anonymous), the number of ideas and the column. It never shows the text of an idea.
- **Batched, never a storm.** Publishes by the same person into the same column within 3 seconds are one line. When more than three people publish within that window (the end of the Write phase publishes everybody's drafts at once, `autoPublish`), the line becomes one summary, "6 people published 23 ideas".
- **Derived, not sent.** Each device builds the line from the publish events it already receives, so there is no new event, no protocol change and no relay traffic. Because the line is derived, it is shown only for live events, never for replay or when joining late.
- **Combined with the activity feed.** The same batch is one entry in the activity feed (always listed, like arrivals), so people who missed the toast, or who turned toasts off, can read it later. The toast is the optional part.
- **Board setting, ON or OFF at creation.** A new board setting `announcePublish` is chosen in the creation form and changeable later in the board options by facilitators; it is shared by everyone on the board (it is a broadcast, so one switch for all). The factory default is OFF (calm by default, `ux-calm`). A personal preference in Profile, "Announce published ideas on my new boards", makes the creation form start with ON, and is part of the synced preferences. Simple mode creates the board with the personal default and does not show the toggle.
- **Respectful display.** Toasts follow the existing toast rules (safe zone, time, reduced motion), stay out of presenter mode and the TV layout unless the presenter shows toasts, and are announced once through the polite live region.

Out of scope: announcing edits, deletions, moves or votes; showing the idea's text in the line; per-user opt-out on a board that has the setting on (a participant who dislikes toasts uses the existing toast controls); email or system notifications.

Bounded contexts: Ideation (a derived read model over publish events), Board session (setting at creation), Notifications (toast and feed). Relay traffic: none added; the free-plan budget is unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`: the `announcePublish` setting at creation and in the options, personal default.
- `notifications`: the publish toast and its batching, the feed entry.

## Impact

- Domain: `announcePublish?: boolean` next to `announceArrivals` in `settings` (types, `board.init` and `settings.update` commands, snapshot), additive and optional so older clients ignore it.
- Application: a read model `publishBatches` over the live event stream (author, column, count, window), an `ActivityEntry` kind `published`.
- Web: `BoardSetupForm.vue` (toggle in advanced mode), `OptionsDialog.vue`, `ProfileDialog.vue` (personal default), `ToastHost.vue`, `ActivityFeed.vue`, `stores/settings.ts` and the synced list, i18n fr and en with plural forms, guide step.
