# Changelog

## [1.1.0](https://github.com/maoudia/RetroBoard/compare/v1.0.0...v1.1.0) (2026-10-24)


### Features

* **crypto:** add WebCrypto primitives package ([ef49d5e](https://github.com/maoudia/RetroBoard/commit/ef49d5ee2ab81f722f4c6d247d158a42a21e9216))
* **crypto:** native curve detection with @noble/curves fallback and /check page ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **domain:** add KeyRing and invite fragment codec ([8f1c69a](https://github.com/maoudia/RetroBoard/commit/8f1c69ae145666108b7007975cd8ee4c0a1ad668))
* **domain:** signed genesis, facilitator capability and authorship fold ([8494bdf](https://github.com/maoudia/RetroBoard/commit/8494bdfe1286885dc1d6496339a2d4b267ca6145))
* **edge:** publish security.txt (RFC 9116) and SECURITY.md ([9b7b090](https://github.com/maoudia/RetroBoard/commit/9b7b090551b70fbb776b957464e61fe58254506f))
* **relay:** serve the WebMCP origin trial token per host; bump CI actions ([f38b98a](https://github.com/maoudia/RetroBoard/commit/f38b98a24d2bb553bb08bee2ca01d6dc308e542d))
* RetroBoard, themeable real-time retro board (Nuxt static + Cloudflare Durable Objects) ([216ef79](https://github.com/maoudia/RetroBoard/commit/216ef7963d4116ea74377a5cb770dc21c4fbf3d6))
* **web:** lazy-load the MCP-B WebMCP polyfill when opted in without native support ([3f60006](https://github.com/maoudia/RetroBoard/commit/3f600062aa3584a9509c662199a00f26ba652241))
* WebMCP tools for AI agents in the browser (opt-in, human-confirmed writes) ([e5f0645](https://github.com/maoudia/RetroBoard/commit/e5f06453ed0d27453e7454ebeda5dde194210915))


### Bug Fixes

* **ci:** call the license script with pnpm run; 'pnpm licenses' is a pnpm ([4f3a004](https://github.com/maoudia/RetroBoard/commit/4f3a0044f332906c5b5fa255199335f05b461926))
* **ci:** shellcheck-clean spec gate, licence errors as annotations, security overrides ([337e28e](https://github.com/maoudia/RetroBoard/commit/337e28e5ba15d893520d837128f78af2fe28fafc))
* force the static Nitro preset so Cloudflare Workers Builds uses wrangler.jsonc ([516879b](https://github.com/maoudia/RetroBoard/commit/516879be21edd462d0f94c76c7f26a52e0fc0709))
* **ui:** languages listed EN, FR, then automatic; no emoji before theme names ([a06a14e](https://github.com/maoudia/RetroBoard/commit/a06a14e4ec93ff7084e441644f0df0c1199d0d44))
