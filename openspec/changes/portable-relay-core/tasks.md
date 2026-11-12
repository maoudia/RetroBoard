# Tasks

## 1. Runtime-neutral room core behind the Durable Object

- [x] 1.1 ADR-0036 "Cloudflare is one deploy target; the relay core is runtime-neutral" filled in (context, options, consequences, relation to ADR-0001 and ADR-0018), `docs/adr/0001` gets a one-line pointer in More Information; verify `pnpm adr:check` passes
- [x] 1.2 Extract `RoomCore<S>` and `RoomPort<S>` into `apps/relay/src/core/room.ts` (no `cloudflare:*`, no `node:*`, clock passed in), move `logger.ts` under `core/`; verify `pnpm typecheck` and `pnpm arch` with the new rule `relay-core-is-runtime-neutral` in `.dependency-cruiser.cjs`
- [x] 1.3 `apps/relay/src/adapters/cloudflare.ts` (`git mv` of `relay-room.ts`): `RelayRoom` keeps its name and the hibernation mechanics and delegates to the core; `index.ts` and `env.ts` point at it; `wrangler.jsonc` untouched; verify existing `apps/relay/test/*` green, the storage guard test also reads `core/room.ts`, `pnpm generate && pnpm e2e:core` and `node scripts/smoke.mjs http://localhost:8787` against `wrangler dev` green
- [x] 1.4 `apps/relay/test/room-core.test.ts` with a fake port: welcome and peers (own id included), history replay and dedup, `eph` fan-out, `sig` routing (unknown target dropped), `wrong-room`, `invalid`, full refusal (`err full` then 4008, not counted), 1009 on an oversized message, 1008 on board frames over budget while `eph` over budget is dropped, attachment written back after every frame, leave broadcasts `peers`; verify `pnpm test` green and the relay coverage threshold still met

## 2. Runtime-neutral HTTP handler and client address

- [ ] 2.1 `apps/relay/src/core/http.ts`: `handleHttp(request, deps)` over an assets port and a relay callback, `headers.ts`, `errors.ts`, `guards.ts`, `origin.ts` moved under `core/`; `index.ts` becomes the Cloudflare wiring only; verify `apps/relay/test/*` green, `pnpm arch`, smoke and `pnpm e2e:core` against `wrangler dev` unchanged
- [ ] 2.2 `clientIp(request, settings, socketAddress)` with `CLIENT_IP_HEADER` and `TRUSTED_PROXIES` settings, `CF-Connecting-IP` set in `wrangler.jsonc` and `deploy/selfhost`; verify unit tests: configured header used, unconfigured `X-Forwarded-For` ignored, trusted proxy count honoured, socket address fallback

## 3. Node adapter

- [ ] 3.1 `apps/relay/src/adapters/node.ts` with `ws` (license checked, `pnpm licenses:check`): static reader with the asset-layer rules (exact, `.html`, `/index.html`, SPA shell, hashed-asset 404, `ETag` and 304, `HEAD`, traversal-safe), `/ws2` through `admitUpgrade`, in-process room registry with the core, `ping` to `pong`; esbuild bundle script to `apps/relay/dist/node.mjs`; verify `node apps/relay/dist/node.mjs` serves the generated site and `node scripts/smoke.mjs http://localhost:PORT` passes 10/10
- [ ] 3.2 Hardening: `maxPayload = MAX_FRAME_BYTES`, ping and idle timeout, `bufferedAmount` guard, per-address connection cap and connect rate, `SIGTERM` drain with close 1001; verify unit tests of the pure pieces (address book, idle policy) and a script test that an oversized frame closes with 1009 and a `SIGTERM` closes the sockets with 1001
- [ ] 3.3 Node logs never carry a URL: a test greps the adapter's log output of a full smoke run for the room id and the path; verify the test passes and `knip`, `lint`, `typecheck` stay green with the new entry point

## 4. Adapter contract suite and CI targets

- [ ] 4.1 Relay protocol script (`scripts/relay-contract.mjs`): two sockets on one room, asserts the frame sequences of the `relay-core` spec against any base URL; verify it passes against `wrangler dev` and the Node adapter
- [ ] 4.2 CI: push gate runs smoke, the contract script and `pnpm e2e:core` against the Node adapter; a second job and the nightly run them against `wrangler dev`; `scripts/e2e-core.mjs` and `playwright.config.ts` take the target from an environment variable; verify both jobs green on the pull request including the WebRTC specs in CI (workflow edits need the maintainer's request in the issue; otherwise document the change and leave it as a follow-up)

## 5. Container on the Node adapter

- [ ] 5.1 `Dockerfile` runtime stage copies the site, `dist/node.mjs` and `ws` only and starts `node dist/node.mjs`; `deploy/selfhost` configuration for the Node adapter (`SELF_HOSTED=1`, `RATE_LIMIT_PER_MIN=0`, `CLIENT_IP_HEADER` unset); keep a `:workerd` tag for one release; verify the container smoke job of `selfhost-container-gate` passes on the image, image size and RSS recorded in `docs/capacity.md`
- [ ] 5.2 Load parity: `pnpm load:relay --clients 30 --boards 1 --seconds 10` against both adapters, numbers in `docs/capacity.md`; verify 30/30 connected and 0 errors on both and the document states the single-instance limit

## 6. Documentation and privacy text

- [ ] 6.1 `docs/architecture.md` (sections 3, 5.3, 11), `docs/self-hosting.md` (Node runtime, compose with Caddy, proxy log format without the query string, room-affinity recipes for nginx, Caddy and HAProxy), runbooks (`deploy`, `edge`, `incident`, `maintenance`), README architecture block and badge; verify `pnpm docs:check` and a reading pass against the shipped image
- [ ] 6.2 Operator block of the privacy and legal pages configurable per deployment (fr and en keys, hosted defaults name MAIDAF and Cloudflare, no hard-coded Cloudflare outside the default); verify i18n tests, `apps/web` unit tests, the legal and privacy e2e, and the 360 px overflow check

## Workflow follow-up

- Archive the change after the last group merges and CI is green on main; do not lower the work-in-progress ceiling in that pull request.
