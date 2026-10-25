# Design

## Decisions

- **One component, many pages**: `ServicePage` (icon, title, explanation, primary and secondary actions, optional details) with i18n keys `service.<page>.*`. Product design tokens, not the board theme.
- **Routing**: Nuxt `error.vue` handles client 404 and 500 (`createError`). The Worker keeps `not_found_handling: single-page-application` for real routes but answers unknown *top-level* paths (not `/board`, `/new`, `/check`, legal pages, assets) with the generated `404.html` and status 404, so crawlers and link checkers get a real 404.
- **Worker HTML vs text**: when `Accept` contains `text/html` and the request is a navigation (`Sec-Fetch-Mode: navigate`), errors return the static page from `ASSETS` with the right status; otherwise a short text body. The CSP and security headers are applied to these responses like any page.
- **Maintenance**: `MAINTENANCE=1` (a plain Worker variable, not a secret) makes the Worker serve `maintenance.html` with 503 and `Retry-After`, except `/healthz` and the legal pages; WebSocket upgrades get 503.
- **Offline**: the app detects `navigator.onLine === false` or repeated connection failures before the first snapshot and shows the offline page with the list of boards that have a local copy. No service worker in this change (to keep the CSP and update story simple); an installable offline shell can come later.
- **Error ids**: a random 8-character id shown on the 500 page and logged to the browser console only (no telemetry, no server log of client errors).
- **Accessibility**: one `h1`, focus moved to it, status code in the document title, axe clean.

Where things live: `apps/web/app/error.vue`, `apps/web/app/components/ServicePage.vue`, pages in `apps/web/app/pages`, Worker routing in `apps/relay/src/index.ts` (pure helper `pickErrorResponse` unit tested).

Security and privacy note: error pages contain no board data, no stack traces and no request details beyond the status; nothing new reaches the relay.
