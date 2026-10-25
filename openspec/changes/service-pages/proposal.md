# Proposal

## Why

Unknown URLs, server errors, a dropped network, a browser without the needed crypto, or a closed board show raw text ("Method not allowed") or the framework's default error screen. Every situation where RetroBoard cannot do what the visitor wanted deserves a clear, branded page that says what happened and what to do next.

## What Changes

- One "service page" layout (product design, light and dark, fr/en, 360 px to TV) used by:
  - **404 Not found**: unknown path, with links to create a board, the landing and the browser check; a typo helper suggests `/board`, `/new`, `/privacy` when the path is close.
  - **500 Something went wrong**: unexpected client error, with "Reload" and a copyable error id (no stack trace, no board data).
  - **Offline**: no network when opening the site; boards with a local copy can still be opened read-only (link to recent boards).
  - **Unsupported browser**: no WebCrypto, WebSocket or secure context; shows what is missing (reuses /check) and supported browsers.
  - **Board not found or closed**: invalid link, retired v1 link, board destroyed by its facilitator (board-lifecycle), wrong room after a move (facilitator-moderation).
  - **Board full**: stays the in-board banner (exists), linked from the page catalogue for consistency.
  - **Maintenance**: a static page the owner can switch on with one Worker variable (no deploy of the app), for planned work.
  - **Too many requests**: when the edge rate limit or the relay budget answers, the browser shows a page with a retry timer instead of a blank connection error.
- The Worker returns the branded page (with the right status code: 404, 405, 429, 500, 503) when a browser navigates to it, and keeps short plain-text bodies for API and WebSocket clients.
- A dev-only catalogue page lists every service page for review and for visual tests.

Out of scope: Cloudflare-hosted error pages (edge errors before the Worker runs, controlled in the Cloudflare dashboard), service worker caching of the whole app (offline page only).

Bounded contexts: none (presentation and platform). No relay traffic.

## Capabilities

### New Capabilities

- `service-pages`: branded pages for errors and unavailable states.

### Modified Capabilities

None.

## Impact

- Web: `error.vue` (Nuxt error page), `ServicePage` component, pages for offline, unsupported, closed board, maintenance, a dev catalogue.
- Relay Worker: HTML responses for navigations (Accept: text/html) on 404/405/429/503, maintenance switch (`MAINTENANCE` variable), CSP unchanged (no inline script or style).
- Generate: a static `404.html` and `offline.html` emitted at build time with hashed assets.
