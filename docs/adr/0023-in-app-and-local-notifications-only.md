---
status: proposed
date: 2026-10-25
decision-makers: Moncef Aoudia
---

# In-app and local notifications only

## Context and Problem Statement

Participants miss the end of phases and timers. Notifications are needed, possibly while the tab is in the background. How are they delivered without a server and without a vendor?

## Decision Drivers

* No server-side storage, no paid service, no vendor lock-in (ADR-0018)
* Works with the tab open, which is how a live retro happens
* Opt-in only for anything outside the page

## Considered Options

* In-app popups and toasts, plus local system notifications (Notification API) on opt-in while the page is open
* Web Push through the browser push services
* In-app popups only

## Decision Outcome

Chosen option: "In-app popups and toasts, plus local system notifications (Notification API) on opt-in while the page is open", because every peer already knows when a timer ends, so the page can notify by itself. Web Push would need stored subscriptions, a server to send them and the browser vendors' push services, which ADR-0018 rules out.

### Consequences

* Good, because nothing leaves the device and nothing is stored
* Good, because a hidden tab can still show a system notification after the person allowed it
* Bad, because a closed tab gets nothing (acceptable: a retro happens with the board open)

## More Information

* Notification API: <https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API>
* OpenSpec change: phase-end-notifications.
