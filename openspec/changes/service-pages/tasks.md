# Tasks

## 1. Pages

- [x] 1.1 `ServicePage` component and `error.vue` (404 with typo suggestions, 500 with error id), fr/en, light/dark, 360 px to TV; verify e2e and axe
- [x] 1.2 Offline page listing this device's recent boards, unsupported-browser page reusing /check, invalid and retired board links on the shared layout; verify e2e for each state. Not done: "closed" and "moved" board pages, because the domain has no such state yet (to revisit with board-lifecycle); the offline page opens recent boards through the normal board route, whose local replica serves them.
- [x] 1.3 Dev-only catalogue page listing every service page (404 in production, e2e-checked). Owner review of light/dark screenshots is still pending (done on real devices tomorrow, per the owner).

## 2. Worker

- [ ] 2.1 `pickErrorResponse` (HTML for navigations, text otherwise, same status) and static `404.html` for unknown top-level paths; verify relay unit tests and an e2e checking status codes
- [ ] 2.2 Maintenance switch (`MAINTENANCE` variable, 503 + Retry-After, /healthz and legal pages exempt) and the too-many-requests page with a retry countdown; verify unit tests and docs/runbooks update
