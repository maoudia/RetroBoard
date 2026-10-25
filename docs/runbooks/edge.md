# Edge security runbook (Cloudflare free plan)

Dashboard settings are not code: this checklist is the source of truth. Tick each item in the
checklist issue after applying it. Everything here is free-plan. The site only needs Cloudflare to
serve static files and the relay; nothing below creates a dependency the code cannot do without.

Code already enforces (no dashboard needed): HSTS (`max-age=15552000`), HTTP to HTTPS redirect on
public hosts (308), strict CSP, `nosniff`, `X-Frame-Options: DENY`, foreign-origin WebSocket
rejection, in-isolate rate limit (`RATE_LIMIT_PER_MIN`). Dashboard settings are a second layer.

## 1. Domain

- [ ] Custom domain `retroboard.maoudia.com` attached to the Worker (Workers > retroboard > Settings > Domains and Routes).
- [ ] `workers.dev` kept for previews only.
- [ ] Workers traces on: already set in `wrangler.jsonc` (`observability.traces`).

## 2. DNS and TLS (zone `maoudia.com`)

Order of priority:

1. [ ] DNSSEC: enable (DNS > Settings), then publish the DS record at the registrar.
2. [ ] CAA: allow only the CAs Cloudflare uses (`letsencrypt.org`, `pki.goog`, `digicert.com`, `ssl.com`, `sectigo.com`), plus an `iodef` mailto.
3. [ ] SSL/TLS > Edge Certificates > Always Use HTTPS: on.
4. [ ] Minimum TLS version: 1.2.
5. [ ] Automatic HTTPS Rewrites: on. HSTS at the edge: leave off (the Worker sets it; avoids two sources of truth).

## 3. Firewall

1. [ ] Security > Bots > Bot Fight Mode: on.
2. [ ] Security > WAF > Managed rules: Cloudflare Free Managed Ruleset: on.
3. [ ] Custom rules (5 maximum on free), by priority:
   1. Block requests to `/ws2` with an empty `Origin` header or an origin other than the site's own.
   2. Managed challenge on `/ws2` above 60 requests/minute per IP (rate limiting rules, free tier allows one).
   3. Allow `/healthz`, `/.well-known/*` and the smoke-test user agent before any challenge.
4. [ ] Never challenge `/ws2` with an interactive page (WebSockets cannot render it): use block or JS challenge only.

## 4. Verification

```bash
node scripts/smoke.mjs https://retroboard.maoudia.com   # HSTS and http->https redirect included
curl -sI https://retroboard.maoudia.com | grep -i -E "strict-transport|content-security|x-content-type"
dig +short CAA maoudia.com
dig +dnssec +short DS maoudia.com
```

Sources: Cloudflare docs, [HSTS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/),
[Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/),
[Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/),
[WAF managed rules](https://developers.cloudflare.com/waf/managed-rules/). RFC 6797 (HSTS).
Re-check names of dashboard menus before applying: they change.
