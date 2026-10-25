# Proposal

## Why

Owner feedback (2026-10-25): people do not watch the timer or the rings, so the end of a phase or of a countdown goes unnoticed. Each end must be announced with a popup that cannot be missed.

## What Changes

- When a phase timer or the shared countdown reaches zero, every participant sees a centred popup with a megaphone icon: "Time is up for Write" and what comes next ("Next: Group").
  - People who can drive the agenda get "Next phase" and "+2 min"; others get "OK". The popup closes by itself when the phase changes.
  - A short "1 minute left" toast before the end (setting, on by default).
- When the tab is hidden, an optional system notification (browser Notification API, permission asked only when the person turns it on in their options). Nothing goes through a push service (ADR-0023).
- Optional short sound, off by default, personal setting.
- A phase moved by someone on an open board shows "Bob started Group" in a toast, so nobody is surprised.
- One popup at a time: the queue is shared with talk-time popups and the name nudge.
- Accessible: the popup is an `alertdialog` that does not steal focus from someone typing (it waits for the composer to blur, or 5 s), announced assertively.

Out of scope: email or phone notifications (no server).

Bounded contexts: Facilitation (read model), personal settings (local). No new relay traffic: every peer computes the end from the shared timer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `timer`: end-of-time announcement, warning, optional system notification and sound.

## Impact

- Application: `timerEvents(prev, next, now)` emits `warning` and `ended` once per timer run (no duplicate after a reconnect).
- Web: `PhaseEndPopup`, popup queue service, personal settings (warning, system notification, sound), Notification API wrapper.
- ADR-0023.
