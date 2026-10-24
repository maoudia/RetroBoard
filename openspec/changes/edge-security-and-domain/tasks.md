# Tasks

## 1. Domain and transport

- [ ] 1.1 Add the custom domain route for `retroboard.maoudia.com` in `wrangler.jsonc` and enable traces; verify `wrangler deploy --dry-run` and, after deploy, `curl -I https://retroboard.maoudia.com` returns 200 with security headers
- [ ] 1.2 Write `docs/runbooks/edge.md` (DNSSEC, CAA, Always Use HTTPS, TLS min 1.2, HSTS 6 months, Bot Fight Mode, managed rules, custom rules by priority); verify with the owner and tick each item in the checklist issue

## 2. Pages and files

- [ ] 2.1 Generate `/.well-known/security.txt` at build with Expires one year ahead; verify a unit test parses it and an e2e request returns it
- [ ] 2.2 Add legal notice, privacy and terms pages (fr, en) linked in every footer; verify e2e navigation and that the privacy page lists the observable data
- [ ] 2.3 Add an HSTS header check and an HTTP->HTTPS redirect check to the production smoke tests; verify they pass after deploy
