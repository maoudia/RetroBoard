# Proposal

## Why

Owner request (2026-11-08): a retro happens while people also read mail and chat. When a participant is not looking at the tab nothing tells them that the phase changed, that voting opened, that it is their turn to talk or that someone answered them in the chat, so the facilitator waits and the retro loses minutes. Today the product has one narrow answer: a system notification when time is up and the tab is hidden (`systemNotify`, change `phase-end-notifications`), and an unread counter inside the chat. The owner wants this to be state of the art: a dot in the favicon when the tab needs the person, real browser notifications when they are away, and full control over which ones they get, with the most important ones on by default.

## What Changes

- **Tab attention**: when the tab is hidden and something needs the person, the favicon gets a dot (or a count up to 9+), the title gets a short prefix, the installed app gets a badge (Badging API), and an optional gentle title blink (off by default). Everything clears when the person comes back or reads it.
- **Local browser notifications**: while a tab or the installed app is alive in the background, the Notification API tells the person about the events they chose. Permission is asked in context (never on load), from the notification centre or from the moment it matters, never in a loop.
- **Notification centre** in the profile: one toggle per category, sensible defaults (the important ones on), a do-not-disturb mode, a sound choice, per-board overrides, and a privacy level for the text (no idea text by default).
- **Away digest**: when the person returns to the tab, one calm summary of what happened ("while you were away: 3 ideas, voting opened"), with a button to mark all as read; clicking a system notification focuses the tab on the right panel.
- **Categories** (importance in brackets): phase changed (important), timer ending (important), your turn to talk (important), voting opened or closing (important), action assigned to you (important), mentioned or answered in the chat (important), the facilitator needs everyone back (important), new idea in your column (quiet, off), chat message (quiet, off), someone joined or left (quiet, off), presenter started (quiet, off).
- Replaces the single `systemNotify` switch by this centre (migration keeps the choice of people who turned it on: it becomes the "timer ending" and "phase changed" toggles).
- ADR for the decision, which refines ADR-0023 (it already allows local notifications; this change widens the use to a notification centre, the favicon and the app badge, and states again that Web Push stays out).

Out of scope: Web Push and any server that sends something to a browser vendor's push service (it needs stored subscriptions and a server: ADR-0018, ADR-0023, no server-side storage); e-mail, SMS or chat-app notifications; notifications when no tab and no installed app is alive; sound packs beyond one subtle chime; notifications about other boards than the open ones.

Bounded contexts: Presence and Facilitation (events that matter), Companion (the local attention layer, a read model over events already folded in every browser). No protocol change: every event is already in the signed log, each browser derives its own attention events.

Free-plan budget: no new relay traffic. Nothing is sent anywhere; the notification text is built on the device.

## Capabilities

### New Capabilities

- `attention`: the tab attention state (favicon, title, app badge, blink), the notification categories and their rules, the away digest.

### Modified Capabilities

- `notifications`: system notifications become a centre with categories, defaults and do-not-disturb instead of one time-is-up switch.

## Impact

- Packages: an attention read model and rules in `packages/application` (pure: events in, attention items out); no domain change.
- Web: a `useAttention` composable (visibility, favicon, title, badge), a notification adapter over the Notification API, the notification centre in the profile dialog, the away digest popup, settings migration, fr/en keys.
- Static: a small favicon dot drawn from the existing SVG favicon (data URL, `img-src 'self' data:` already allows it); manifest unchanged.
- Docs: ADR, `docs/accessibility.md` (not only colour), the user guide chapter on notifications.
