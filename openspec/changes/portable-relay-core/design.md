# Design

## Context

See proposal.md for the motivation. What shapes the approach:

- `apps/relay/src/relay-room.ts` (118 lines) is the only source file that imports `cloudflare:workers`. It uses the hibernation API: `ctx.acceptWebSocket`, `ctx.getWebSockets`, `serializeAttachment` / `deserializeAttachment` (the per-connection budgets and ids survive an eviction of the object from memory), `setWebSocketAutoResponse('ping', 'pong')` and `WebSocketPair`. The `EnvelopeBuffer` lives in the object's memory and is lost on eviction, which the protocol already tolerates (ADR-0024, anti-entropy on every connection).
- `apps/relay/src/index.ts` (the Worker `fetch`) depends on Cloudflare through `env.ASSETS` (assets binding), `env.RELAY` (the Durable Object namespace) and the `CF-Connecting-IP` header. Everything else it calls (`headers.ts`, `errors.ts`, `guards.ts`, `origin.ts`, `logger.ts`) is web-standard TypeScript.
- All protocol logic (`checkFrame`, budgets, `EnvelopeBuffer`, frame schemas) is already in `packages/protocol`, shared with the in-browser relay of solo boards (`apps/web/app/transport/local-relay.ts`).
- Hard constraints: no server-side storage, content-free logs, strict CSP, the `RelayRoom` class name is referenced by the `v2` migration and cannot change.
- The report (`rb-cf-independence`, 2026-11-11) ran a 124-line Node prototype against `scripts/smoke.mjs` (10/10) and the core e2e suite with the same results as `wrangler dev`.

## Goals / Non-Goals

**Goals:**

- One implementation of the room behaviour, exercised by unit tests with fake sockets, used unchanged by every adapter.
- The Cloudflare deployment behaves byte for byte as today: same frames, same order, same close codes, same hibernation and attachment mechanics, same `wrangler.jsonc`.
- A Node adapter good enough to be the default of the container image: hardened, small, no framework.
- One contract suite that proves both adapters, run where each belongs (push gate on Node, nightly and release on both).

**Non-Goals:**

- Horizontal scaling of the Node adapter (one instance per room is documented, routing is the proxy's job).
- Hibernation on Node (an idle socket costs memory only).
- Any change to client code or to the wire protocol.
- Replacing Cloudflare for the hosted service.

## Decisions

### D1. The room core is generic over the socket type and talks to a port

`apps/relay/src/core/room.ts` exports `RoomCore<S>` and the port it needs:

```ts
interface Attachment extends Budgets { rh: string; room: string; conn: string }
interface RoomPort<S> {
  sockets(): readonly S[]                 // the live sockets of the room
  send(ws: S, text: string): void
  close(ws: S, code: number, reason?: string): void
  attachment(ws: S): Attachment | null    // read the per-connection state
  attach(ws: S, att: Attachment): void    // write it back (budgets mutate on every frame)
}
```

The core keeps the `EnvelopeBuffer` and the logger and exposes `full()`, `refuse(ws, rh)`, `open(ws, rh, room, now)`, `message(ws, data, now)` and `leave(ws)`. The clock is a parameter (`now`), never `Date.now()` inside the core, so budgets are unit tested deterministically.

Why a port with attachment accessors rather than a `Map<socket, state>` inside the core: on Cloudflare the object can be evicted while its sockets stay open; the state of a connection must live in the socket attachment and be re-read on every message. Keeping that rule in the port keeps the core honest for both runtimes: the Node port stores attachments in a `WeakMap`, the Cloudflare port calls `serializeAttachment` / `deserializeAttachment`. Rejected: a core that holds the socket list itself (it would silently break hibernation), and wrapping each Cloudflare socket in an object (identity comparisons in fan-out would break and allocate on the hot path).

Why `full()` and `refuse()` are separate from `open()`: the Cloudflare adapter must decide before it accepts the socket through `ctx` (a refused socket is never hibernatable and never counted); the order of the frames on the refused socket (`err full`, close 4008) is the core's, so both adapters send the same bytes.

### D2. The Durable Object is a thin adapter and keeps its name

`apps/relay/src/adapters/cloudflare.ts` exports `class RelayRoom extends DurableObject<Env>` (moved with `git mv` from `relay-room.ts`). It owns what is Cloudflare-specific and nothing else: the `WebSocketPair`, `ctx.acceptWebSocket`, the auto-response pair, the close handshake echo in `webSocketClose` (`ws.close(code === 1005 ? 1000 : code)`), `Date.now()`, and the `RoomPort<WebSocket>` over `ctx.getWebSockets()` and attachments. `wrangler.jsonc` (`main`, bindings, migrations) does not change. `index.ts` keeps `export { RelayRoom }`.

### D3. The HTTP handler is runtime-neutral over an assets port

`apps/relay/src/core/http.ts` exports `handleHttp(request, deps)` with `deps = { assets: { fetch(Request): Promise<Response> }, env: Settings, clientIp: string | null, relay: (request, room, rh) => Promise<Response> }`: today's `fetch` minus the stub call. The Cloudflare `index.ts` builds `deps` from `env.ASSETS`, the configured client header and the `RELAY` namespace; the Node adapter from its static reader, the socket address or trusted header, and an in-process room registry. `headers.ts`, `errors.ts`, `guards.ts`, `origin.ts` and `logger.ts` move under `core/`. The asset-layer rules the Worker relies on (exact file, `.html`, `/index.html`, SPA shell, 404 for a missing hashed file) are documented as the assets port contract and asserted by the contract suite, so a Node static reader is held to them.

### D4. Client address is a setting

`CLIENT_IP_HEADER` names the header to trust (`CF-Connecting-IP` in `wrangler.jsonc`, unset by default on Node, where the socket address is used; `X-Forwarded-For` with `TRUSTED_PROXIES` for operators behind a proxy). `clientIp(request, settings, socketAddress)` is pure and unit tested against spoofing: an unconfigured forwarding header never changes the limiter key.

### D5. The Node adapter uses `ws` and `node:http`, nothing else

`apps/relay/src/adapters/node.ts`, bundled to `apps/relay/dist/node.mjs` with esbuild (already in the tree through Nuxt and Wrangler). Static files: the asset-layer rules of D3 plus `ETag`, conditional `GET`, `HEAD`, a path-traversal-safe resolver rooted in the public directory. Sockets: `/ws2` through `admitUpgrade`, `ws` with `maxPayload = MAX_FRAME_BYTES`, `ping` / `pong` liveness and an idle timeout, a `bufferedAmount` guard that closes a socket that does not drain, a per-address connection cap and connect rate (so the edge rules of ADR-0019 are an extra layer, not the only one), `SIGTERM` drain closing every socket with 1001. Logs: the same `consoleLogger`, and the adapter never logs a URL (the room id is in the WebSocket query string). `ws` is MIT, about 150 kB unpacked, no transitive dependency. Rejected: a framework (Fastify, Hono) for one static route and one upgrade; Bun or Deno as the self-host runtime (Node is what the base image and the tooling already use).

### D6. One contract suite, parameterized by base URL

`scripts/smoke.mjs`, the relay protocol assertions (a small script that opens two sockets and checks the frame sequence of the `relay-core` spec) and `tests/e2e/core.json` already take a base URL or `E2E_PORT`. CI gets a `target` dimension: the push gate runs them on the Node adapter (starts in under a second), a second job and the nightly on `wrangler dev`, the release on the built image (`selfhost-container-gate` gives the container job). Cloudflare-only behaviours (asset-layer 404 of ADR-0034, `_headers`) stay asserted on the workerd target.

### D7. The container runs the Node adapter

The runtime stage copies the site, `dist/node.mjs` and `ws`, and starts `node dist/node.mjs`. Wrangler, workerd and the npm removal gymnastics leave the image (about 285 MB instead of 525 MB, memory in the tens of MB instead of about 1 GB; measured and recorded in `docs/capacity.md` in the task). A `:workerd` tag is kept for one release as a fallback.

### Where the types live

| Type or function | Location | Layer |
|---|---|---|
| `RoomCore<S>`, `RoomPort<S>`, `Attachment` | `apps/relay/src/core/room.ts` | relay core (runtime-neutral) |
| `handleHttp`, `HttpDeps`, `Settings`, `clientIp` | `apps/relay/src/core/http.ts`, `core/client-ip.ts` | relay core |
| `Logger`, `consoleLogger`, `roomHash`, headers, errors, guards, origin | `apps/relay/src/core/*.ts` (moved) | relay core |
| `RelayRoom` (Durable Object), `Env` | `apps/relay/src/adapters/cloudflare.ts`, `env.ts` | Cloudflare adapter |
| Node server, static reader, room registry, hardening | `apps/relay/src/adapters/node.ts` (+ small siblings) | Node adapter |
| Worker entry (`fetch`, re-export of `RelayRoom`) | `apps/relay/src/index.ts` | Cloudflare adapter |
| Frame checks, budgets, `EnvelopeBuffer` | `packages/protocol` (unchanged) | protocol |
| `LIMITS` | `packages/domain` (unchanged) | domain |

Architecture rule (`.dependency-cruiser.cjs`): `relay-core-is-runtime-neutral`: from `^apps/relay/src/core` only to `^apps/relay/src/core` and `^packages/(protocol|domain)/src`; `cloudflare:*` and `node:*` therefore fail the check.

### Security and privacy note

What the relay can observe does not change: room ids, client addresses, connection times, envelope sizes and counts, never content. The core logs event names, short room hashes and counts only (`relay-core` spec). On Node the request URL (room id in the query string) is never logged by the adapter, and the self-hosting guide shows the proxy log format that drops the query string, because Workers Observability's `redact_query_string` has no Node equivalent. The per-connection attachment holds budgets, a short hash, the room id and a connection id: no board data, on either runtime. The Node adapter's own limits (payload, idle, backpressure, per-address cap) replace the part of the edge protection that a self-hosted instance does not have.

## Risks / Trade-offs

- [Behaviour drift between adapters] -> the room logic exists once; the contract suite runs on both targets in CI; the unit tests of the core assert the frame sequences the spec lists.
- [Hibernation subtly broken by the extraction] -> the Cloudflare port reads the attachment on every call and writes it back after `checkFrame`, as today; the core never caches per-socket state; the core e2e suite on `wrangler dev` stays in the push gate until the Node target has run green for a while.
- [`welcome.peers` includes the new connection's own id today] -> kept as is (the client handles it); the spec states it so a port does not "fix" it.
- [A Node static reader that diverges from the asset layer] -> the rules are written down as the assets port contract and the smoke script asserts them (`.html` fallback, SPA shell, hashed-asset 404, headers).
- [Self-hosted instances lose edge protection] -> the Node adapter caps connections and connect rate per address and bounds payloads; volumetric protection stays the operator's proxy, as documented.
- [Work-in-progress ceiling] -> groups land one per pull request; the change is started only when `pnpm wip` reports a free slot.

## Migration Plan

1. Group 1 (core + Cloudflare adapter) ships alone and changes nothing observable: deploy as any release; rollback is the previous version.
2. Groups 2 to 4 add code paths that the Cloudflare deployment does not execute (Node adapter, suite) except the client-address setting, which keeps `CF-Connecting-IP` on Cloudflare.
3. Group 5 switches the image's command; the `:workerd` tag stays one release for operators who need to roll back.
4. Docs and privacy text last; the hosted service's legal text is unchanged by default.

## Open Questions

- Whether the push gate should drop `wrangler dev` entirely once the Node target has been green for a release cycle, or keep both forever (cost: about one minute of CI per run). Decided when group 4 has data.
