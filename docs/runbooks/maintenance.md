# Maintenance mode and rate limiting

Source: change `service-pages` (apps/relay/src/guards.ts).

## Switch the site to maintenance

1. Cloudflare dashboard, Workers & Pages, `retroboard`, Settings, Variables: add `MAINTENANCE` = `1`
   (or `npx wrangler deploy --var MAINTENANCE:1`).
2. Browser navigations answer `503` with `Retry-After: 30` and the static page `/maintenance`
   (French and English, no app bundle). WebSocket attempts answer `503` text.
3. Still served: `/healthz`, `/legal`, `/privacy`, `/terms` and static assets, so the legal pages stay reachable.
4. Switch back: remove the variable (or set `0`) and redeploy.

Boards in progress are not lost: the content lives in the participants' browsers (local replica).

## Too many requests

- The Worker counts HTML page loads per client IP (`CF-Connecting-IP`) in isolate memory (no storage).
  Above `RATE_LIMIT_PER_MIN` (default `300`, `0` disables) it answers `429`, `Retry-After: 30` and `/busy`
  with a countdown that reloads the page.
- This is approximate by design (one counter per isolate). The strong layer is a Cloudflare rate limiting
  rule in front of the Worker; the free plan includes one rule, configure it in the dashboard if needed.

## Checks

- `curl -i -H 'Accept: text/html' https://<host>/new` shows `503` while `MAINTENANCE=1`.
- `curl -i https://<host>/healthz` must stay `200`.
