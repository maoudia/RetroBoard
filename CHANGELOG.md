# Changelog

## [1.1.0](https://github.com/maoudia/RetroBoard/compare/v1.0.0...v1.1.0) (2026-10-24)


### Features

* **agenda:** time-boxed agenda with phase ring and rules; faster CI ([d75cc35](https://github.com/maoudia/RetroBoard/commit/d75cc357a0cbce842fec6ed6a5bf67fd5e6d8955))
* **clusters:** merge clusters, title suggestions, expand all per column ([c3fae4c](https://github.com/maoudia/RetroBoard/commit/c3fae4c59d4a31a982276af9a1472acf9d162d36))
* **crypto:** add WebCrypto primitives package ([ef49d5e](https://github.com/maoudia/RetroBoard/commit/ef49d5ee2ab81f722f4c6d247d158a42a21e9216))
* **crypto:** native curve detection with @noble/curves fallback and /check page ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **domain:** add KeyRing and invite fragment codec ([8f1c69a](https://github.com/maoudia/RetroBoard/commit/8f1c69ae145666108b7007975cd8ee4c0a1ad668))
* **domain:** signed genesis, facilitator capability and authorship fold ([8494bdf](https://github.com/maoudia/RetroBoard/commit/8494bdfe1286885dc1d6496339a2d4b267ca6145))
* **edge:** publish security.txt (RFC 9116) and SECURITY.md ([9b7b090](https://github.com/maoudia/RetroBoard/commit/9b7b090551b70fbb776b957464e61fe58254506f))
* **facilitation:** roles, hand-over, open facilitation and hide participant ([dc0a477](https://github.com/maoudia/RetroBoard/commit/dc0a47796961de9d63584670cebfe03050ce60cf))
* **relay:** serve the WebMCP origin trial token per host; bump CI actions ([f38b98a](https://github.com/maoudia/RetroBoard/commit/f38b98a24d2bb553bb08bee2ca01d6dc308e542d))
* RetroBoard, themeable real-time retro board (Nuxt static + Cloudflare Durable Objects) ([216ef79](https://github.com/maoudia/RetroBoard/commit/216ef7963d4116ea74377a5cb770dc21c4fbf3d6))
* **sync:** hybrid clock, version vectors, fold checkpoints and rate limits ([c5ef8b8](https://github.com/maoudia/RetroBoard/commit/c5ef8b83d733496c7b52aed685e4ab0574b9f17c))
* **themes:** imposed board theme with personal light/dark variant; WebKit nightly ([4f7a357](https://github.com/maoudia/RetroBoard/commit/4f7a35755b4d841e4931d76549fe3f442312342f))
* voting v2 with ranking, and actions v2 with carry-over ([d763ed4](https://github.com/maoudia/RetroBoard/commit/d763ed41fd0d7d0df931308354a414a0a6d6d3d7))
* **web:** encrypted local replica, retention setting and board file ([072b5cb](https://github.com/maoudia/RetroBoard/commit/072b5cb5adbf452585a0195001c316fdd513f809))
* **web:** lazy-load the MCP-B WebMCP polyfill when opted in without native support ([3f60006](https://github.com/maoudia/RetroBoard/commit/3f600062aa3584a9509c662199a00f26ba652241))
* WebMCP tools for AI agents in the browser (opt-in, human-confirmed writes) ([e5f0645](https://github.com/maoudia/RetroBoard/commit/e5f06453ed0d27453e7454ebeda5dde194210915))
* **web:** optional passcode for encrypted boards ([c86b39c](https://github.com/maoudia/RetroBoard/commit/c86b39c3567147a80e08b3b16e03705530bffa1c))
* **web:** share dialog explains encryption; facilitator link on demand; docs ([eb0ea29](https://github.com/maoudia/RetroBoard/commit/eb0ea2976c0eebe3ba91268c237632204d3a260c))


### Bug Fixes

* **a11y:** results action buttons name starts with their visible text; raise mutation floors ([c7e38f4](https://github.com/maoudia/RetroBoard/commit/c7e38f42868a8d25b18ef2d0db5185761a2b277c))
* **ci:** call the license script with pnpm run; 'pnpm licenses' is a pnpm ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **ci:** shellcheck-clean spec gate, licence errors as annotations, security overrides ([337e28e](https://github.com/maoudia/RetroBoard/commit/337e28e5ba15d893520d837128f78af2fe28fafc))
* force the static Nitro preset so Cloudflare Workers Builds uses wrangler.jsonc ([516879b](https://github.com/maoudia/RetroBoard/commit/516879be21edd462d0f94c76c7f26a52e0fc0709))
* **ui:** languages listed EN, FR, then automatic; no emoji before theme names ([a06a14e](https://github.com/maoudia/RetroBoard/commit/a06a14e4ec93ff7084e441644f0df0c1199d0d44))
* **web:** cross-browser CSP, a11y and dialog race found by the e2e matrix ([709b084](https://github.com/maoudia/RetroBoard/commit/709b0841295210b10fa1580e8866bd11a31f3855))
