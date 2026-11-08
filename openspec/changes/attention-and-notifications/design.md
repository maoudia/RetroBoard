# Design

## Context

Every browser folds the same signed event log and already knows when a phase starts, a timer ends, voting opens, a turn is given or a message arrives (`activityBetween` and `presenceBetween` in `packages/application/src/activity`, the chat unread count in the chat store, `usePhaseEnd` for the timer end). What is missing is a single place that decides, on the device, whether an event needs the person, how loudly, and where it shows (favicon, title, app badge, system notification, away digest). The existing `systemNotify` utility shows one notification kind with one tag.

## Goals and non-goals

- Goals: a pure attention model that is easy to test; one adapter per browser capability that degrades silently; the person stays in control; nothing about the board content leaves the device.
- Non-goals: any server, any push service, notifications with no live tab or app.

## Why no Web Push

Web Push delivers a message to a browser that is not running. That needs a push subscription (an endpoint stored by a server), a server that signs and sends the message, and the browser vendor's push service in between. It breaks zero infrastructure and zero storage (ADR-0018, openspec/config.yaml) and it would put event metadata in third-party systems. The decision of ADR-0023 stands: local notifications only, while the tab or the installed app is alive. A closed browser gets nothing, which is acceptable for a retro that is held with the board open. The installed app (PWA) on Android and desktop usually survives in the background long enough to cover a meeting.

## Where things live

| Piece | Layer | Notes |
|---|---|---|
| `AttentionEvent`, `AttentionCategory`, `AttentionPolicy`, `attentionFor(events, policy, ctx)` | `packages/application/src/attention` | pure, no I/O, unit tested; input is what `activityBetween`, chat and the talk state already produce |
| Category table (id, importance, default, i18n key, target panel) | `packages/application/src/attention/categories.ts` | one table drives the centre, the defaults and the tests |
| `AttentionState` (hidden, items, unread, dnd) and its reducer | `packages/application/src/attention/state.ts` | state machine: visible, hidden-idle, hidden-with-items, returned-with-digest |
| `useAttention` | `apps/web/app/composables` | wires `visibilitychange`, the activity store, the chat store, the settings; owns the adapters |
| Favicon adapter | `apps/web/app/utils/favicon.ts` | draws the dot on the existing SVG favicon, sets a data URL link, restores the original |
| Title adapter | `apps/web/app/utils/tab-title.ts` | prefix `(2) ` or a dot, restores the title |
| Badge adapter | `apps/web/app/utils/app-badge.ts` | `navigator.setAppBadge` and `clearAppBadge`, feature detected |
| Notification adapter | `apps/web/app/utils/system-notify.ts` (extended) | one tag per category, `silent` unless the sound is on, click focuses the tab and opens the target panel |
| Notification centre, away digest | `apps/web/app/components` | profile dialog section, a popup slot for the digest |

## Categories and defaults

| Category | Importance | Default | Shows on |
|---|---|---|---|
| Phase changed | important | on | favicon, title, badge, system |
| Timer ending (warning, then end) | important | on | favicon, title, badge, system |
| Your turn to talk | important | on | favicon, title, badge, system |
| Voting opened or about to close | important | on | favicon, title, badge, system |
| Action assigned to you | important | on | favicon, title, badge, system |
| Mentioned or answered in the chat | important | on | favicon, title, badge, system |
| Facilitator calls everyone back (presenter started, reveal) | important | on | favicon, title, badge, system |
| New idea in my column | quiet | off | favicon dot only when turned on |
| Chat message | quiet | off | favicon, title count when turned on |
| Someone joined or left | quiet | off | digest only |
| Presenter started | quiet | off | digest only |

"On" means the category may raise attention. Whether a system notification is shown also depends on the permission, the browser, do-not-disturb and the focus rule below.

## Rules (the policy)

1. **Focus rule**: nothing is raised while the tab is visible and focused (the toast and the live region already tell the person). Attention is for the hidden tab and for the installed app in the background.
2. **Do not disturb**: a switch and an optional schedule (a number of minutes: "for 1 hour"); while on, items are kept for the digest and nothing is shown or sounded.
3. **Grouping**: one system notification per category at a time (`tag`), replaced by the latest, with a count in the body ("3 new ideas"). A burst becomes one line.
4. **Rate limit**: at most one system notification per 5 seconds and at most 6 per minute per board; the rest only feeds the favicon and the digest.
5. **Privacy level of the text**: `private` (default): generic titles ("Voting is open", "Your turn to talk", "New idea in Start"), never idea text, names or chat text; `names`: adds who ("Alice assigned you an action"); `full`: adds the idea or message text, off by default and labelled as showing board content on the operating system's notification centre. The level is a per-device setting.
6. **Per-board overrides**: the centre shows the global defaults; a board can mute all or change a category for that board only (stored locally with the recent boards).
7. **Sound**: off by default; one subtle chime for important items when turned on; never played when do-not-disturb is on; respects reduced-motion-like "calm" choices already in the profile.
8. **Permission in context**: the permission prompt is shown only after the person turns a system category on, or accepts an in-page offer such as "Get told when voting opens while you are in another tab" shown once on the first hidden-tab event. A refusal is remembered; the centre then explains how to change it in the browser and keeps the favicon, title and badge working.

## State machine

```
visible --(visibilitychange hidden)--> hiddenIdle
hiddenIdle --(event raises attention)--> hiddenWithItems(n)
hiddenWithItems --(more events)--> hiddenWithItems(n+1)
hiddenWithItems --(visible)--> visibleWithDigest   // digest shown once, items marked read on dismiss or after 8 s
visibleWithDigest --(dismiss | mark all read)--> visible
```

Pure reducer over `(state, signal)` with signals `hidden`, `visible`, `event`, `dismiss`, `dnd`. Timers are only the existing ones; the optional title blink uses one `setInterval` that exists only while hidden with items and the blink option on.

## Tab surfaces

- **Favicon**: the SVG favicon is loaded once, a small filled circle (the accent, with a contrasting ring) is drawn at the top-right on a 32x32 canvas, exported as a data URL and set on a dedicated `<link rel="icon">`; with a count the dot becomes a digit up to 9 then 9+. `img-src 'self' data:` already allows it; no CSP change. Reset restores the original link. Reduced motion: no animation; the dot is static.
- **Title**: `(2) Retro 06/11` for a count, `• Retro 06/11` for a dot; the board title is restored on return.
- **App badge**: `navigator.setAppBadge(n)` on the installed app (Chromium desktop and Android, Safari on iOS 16.4+ for installed web apps), cleared on return.
- **Blink** (off by default): alternates the title between the prefix and the plain title every 1.5 seconds while hidden with items; stops on return; never when the person prefers reduced motion.

## Browser support and what degrades

| Capability | Chrome, Edge, Brave (desktop, Android) | Firefox (desktop, Android) | Safari macOS | Safari iOS and iPadOS |
|---|---|---|---|---|
| Dynamic favicon | yes | yes | partial: the tab icon updates when the tab is visible in the strip, often not in the background | no tab strip icon: skipped |
| Title prefix | yes | yes | yes | yes |
| `Notification` while the tab lives | yes | yes | yes (macOS 13+ shows them when the page is allowed) | only for an installed web app (Add to Home Screen, iOS 16.4+); not in a normal tab |
| `setAppBadge` | installed app | no | installed app (macOS Sonoma+) | installed app (iOS 16.4+) |
| Notification action buttons | yes (not used: KISS) | no | no | no |
| Background throttling | tabs are throttled after a few minutes: events are folded when the page wakes; the installed app is throttled less | similar | stricter on battery | strict: the page can be suspended; nothing is delivered while suspended |

Degradation is silent and ordered: system notification, then app badge, then favicon, then title, then the digest on return. The centre shows which surfaces work on this browser ("Notifications need the installed app on iPhone") instead of failing.

## Privacy and security note

The relay observes nothing new: no message is sent for attention. The notification text is built on the device from the folded state. Under the default privacy level it contains no idea text, no names, no chat text. At level `names` or `full` the operating system's notification centre may keep that text outside the app, which the setting says in words; the board key never appears. `Notification.requestPermission` is called from a user gesture only. Nothing is stored beyond the preferences (local settings) and the per-board overrides (local recents).

## Accessibility

Attention never relies on colour alone: the favicon dot comes with the title prefix, the app badge a number, the digest a text list. The digest popup is a polite live region; important in-page events keep their existing assertive or polite announcements; the centre's toggles are labelled switches with their importance in words; do-not-disturb is a visible state in the toolbar (a bell with a slash).

## Battery and CPU

No new timers while the tab is hidden except the optional blink. Events are already folded by the existing replicas; the attention reducer is O(events since the last signal). The favicon is drawn once per count change and cached by count.

## Risks

- Browsers throttle hidden tabs: a notification can arrive late. The digest on return is the safety net.
- Safari limits: documented in the table, shown in the centre.
- Notification fatigue: grouping, rate limit, defaults on only for what changes what the person must do.

## Decisions to record

ADR "Local attention and notifications without push" refining ADR-0023: keep local-only, widen to categories, favicon and app badge, privacy levels.
