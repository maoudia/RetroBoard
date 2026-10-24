# WebMCP

RetroBoard exposes tools to AI agents running in the user's browser through WebMCP
(change `webmcp-browser-agents`). The API is a draft of the W3C Web Machine Learning
Community Group; Chrome ships it through an origin trial.

## Origin trial

| Origin | Expires |
|---|---|
| `https://retroboard.maoudia.com` | 2027-03-30 |
| `https://retroboard-dev.maoudia.com` | 2027-03-30 |
| `https://retroboard.www-maoudia-com.workers.dev` | 2027-03-30 |

- Tokens live in `wrangler.jsonc` (`vars.ORIGIN_TRIAL_TOKENS`, keyed by host). They are public
  values, not secrets: browsers read them from response headers.
- The Worker adds `Origin-Trial: <token>` to HTML responses of the matching host only
  (`apps/relay/src/headers.ts`). No meta tag, so the CSP stays static.
- Trial window: Chrome 149 to 162, no later than 2027-03-30. Renew or remove the tokens before
  they expire. A unit test checks that each token's origin matches its host.
- Chrome disables a trial feature used on more than 1% of Chrome page loads. WebMCP is opt-in
  in RetroBoard, so this is not expected to matter.

## Manual check in Chrome

1. Open the site on one of the registered origins in Chrome 149 or later.
2. DevTools > Application > Frames > top > Origin Trials: `WebMCP` shows the token as valid.
3. Console: `document.modelContext ?? navigator.modelContext` is not `undefined`.

Local `wrangler dev` (localhost) gets no token; enable the experimental web platform features
flag in `chrome://flags` there.
