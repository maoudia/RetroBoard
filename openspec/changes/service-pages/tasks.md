# Tasks

## 1. Pages

- [ ] 1.1 `ServicePage` component and `error.vue` (404 with typo suggestions, 500 with error id), fr/en, light/dark, 360 px to TV; verify e2e and axe
- [ ] 1.2 Offline page with locally stored boards (read-only open), unsupported-browser page reusing /check, board not found / retired / closed / moved pages; verify e2e for each state
- [ ] 1.3 Dev-only catalogue page listing every service page; verify screenshots of each page in light and dark reviewed by the owner

## 2. Worker

- [ ] 2.1 `pickErrorResponse` (HTML for navigations, text otherwise, same status) and static `404.html` for unknown top-level paths; verify relay unit tests and an e2e checking status codes
- [ ] 2.2 Maintenance switch (`MAINTENANCE` variable, 503 + Retry-After, /healthz and legal pages exempt) and the too-many-requests page with a retry countdown; verify unit tests and docs/runbooks update
