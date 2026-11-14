# Self-hosting

Each release publishes a container image: `ghcr.io/maoudia/retroboard` (tags `X.Y.Z`, `X.Y`, `X`, `latest`; linux/amd64 and linux/arm64). It serves the site and the relay on port 8787 and needs no Cloudflare account. Nothing is stored: boards live in the browsers and the relay only forwards encrypted messages (ADR-0020).

```bash
docker run --rm -p 8787:8787 ghcr.io/maoudia/retroboard:latest
# open http://localhost:8787
```

## The Node runtime

The image runs the **Node adapter** (`node dist/node.mjs`, [ADR-0036](adr/0036-cloudflare-is-one-deploy-target-relay-core-runtime-neutral.md)): the same relay core and the same HTTP rules (security headers, CSP, asset layer behaviour, maintenance and busy pages) as the hosted service, on plain Node with one dependency (`ws`). It holds the static site, the bundle and `ws` and nothing else: no Wrangler, no workerd (about 290 MB, tens of MB of memory, measurements in [capacity.md](capacity.md)). The adapter bounds what one client can cost it: a payload limit equal to the frame limit, a ping and idle timeout, a send-buffer guard, a per-address connection cap and connect rate, and a graceful stop (`SIGTERM` closes every socket with 1001).

The previous image, which ran the Worker under the local workerd runtime started by Wrangler, stays one more release as the `:workerd` tag (`ghcr.io/maoudia/retroboard:workerd`, or `docker build --target workerd .`) for an operator who needs to roll back. The two images take the same port and the same proxy configuration, but the `:workerd` image is configured through `deploy/selfhost/wrangler.jsonc`, not the environment variables below.

### One instance per room

The Node adapter keeps every room in the memory of its process. **One instance serves all the sockets of a room**; a second instance behind a round-robin balancer would split a board in two. One instance carries the 30 participants of a board with room to spare. If you run several instances (more boards than one process takes, or a rolling restart), route by the `room` query parameter of `/ws2` (recipes below). A restart drops the rooms; participants reconnect and re-seed each other, nothing is lost since the boards are in the browsers.

### Settings

Environment variables, the same names as the Worker variables (`deploy/selfhost/relay.env` is a commented template for `docker run --env-file` or compose):

| Variable | Default in the image | Meaning |
|---|---|---|
| `SELF_HOSTED` | `1` | TLS ends at your proxy: no redirect of plain HTTP to HTTPS |
| `RATE_LIMIT_PER_MIN` | `0` | HTML page loads per client and minute before the "too many requests" page; `0` is off, because every visitor shares the proxy address |
| `CLIENT_IP_HEADER`, `TRUSTED_PROXIES` | unset | Where the client address comes from for that limit. Unset: the socket address. Behind one proxy, `CLIENT_IP_HEADER=X-Forwarded-For` (the address is read `TRUSTED_PROXIES` entries from the right, default 1). Any other forwarding header is ignored |
| `ALLOWED_ORIGINS` | empty | Extra origins allowed to open the WebSocket (the site's own origin always is) |
| `MAINTENANCE` | unset | `1` answers pages with a 503 and the maintenance page ([runbook](runbooks/maintenance.md)) |
| `MAX_CONNECTIONS_PER_ADDRESS`, `MAX_CONNECTS_PER_MINUTE` | `200`, `600` | Per-address cap and connect rate of the adapter; `0` turns one off. Per instance, and per proxy address when you do not forward the client address |
| `OPERATOR_NAME`, `OPERATOR_ADDRESS`, `OPERATOR_CONTACT` | unset | Who runs this instance, for the legal and privacy pages (below) |
| `PORT`, `HOST` | `8787`, `0.0.0.0` | Listening address |

### Legal and privacy pages

The legal notice and the privacy page of the hosted service name its hosting provider (Cloudflare). On your instance they must name you. Set `OPERATOR_NAME` (and, if you like, `OPERATOR_ADDRESS` and `OPERATOR_CONTACT`) and the site reads them from `/operator.json`: the legal notice then names your organisation as the operator, the privacy page speaks of "the host of this instance" instead of Cloudflare (and drops the Cloudflare cookie paragraph), and the contact section points to your contact. Without `OPERATOR_NAME` the hosted texts stay as they are, so **set it before you open the instance to other people**. The values are public text, French and English use the same values. The legal pages are prerendered with the hosted wording and switch once the browser has read `/operator.json`, so a visitor may see the hosted wording for a moment.

## Behind a reverse proxy

Browsers need HTTPS for end-to-end encryption (WebCrypto), except on `localhost`. Put the container behind a proxy that terminates TLS and forwards WebSockets (path `/ws2`).

### Compose with Caddy

```yaml
# compose.yaml
services:
  retroboard:
    image: ghcr.io/maoudia/retroboard:latest # pin an exact version in production
    restart: unless-stopped
    env_file: relay.env # optional, see deploy/selfhost/relay.env
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
volumes:
  caddy_data:
```

```caddyfile
# Caddyfile (the certificate is obtained and renewed by Caddy)
retro.example.com {
  reverse_proxy retroboard:8787
  # The room id is in the query string of /ws2: keep it out of the access log.
  log {
    output stdout
    format filter {
      wrap json
      request>uri query {
        delete room
      }
    }
  }
}
```

### Logs: no room id

The Node adapter never logs a URL: its lines carry event names, statuses and a short room hash. The room id is in the query string of the WebSocket URL, so **your proxy's access log is the one place that can record it**. Log the path without the query string:

- Caddy: the `log` block above deletes the `room` parameter.
- nginx: `log_format retro '$remote_addr [$time_local] "$request_method $uri" $status $body_bytes_sent';` (`$uri` has no query string; do not use `$request` or `$request_uri`).
- HAProxy: `http-request set-var(txn.path) path` and `log-format "%ci:%cp [%t] %ft %b/%s %ST %B \"%HM %[var(txn.path)]\""` (the default `httplog` format prints the query string).

A room id is only a random identifier and board content is encrypted, but the privacy page promises that the full id is masked in technical logs.

### Several instances: room affinity

Route every request of a room to the same instance by hashing the `room` parameter; requests without it (pages, files) may go anywhere, every instance serves the site. Verified syntax of each recipe:

```caddyfile
# Caddy
retro.example.com {
  reverse_proxy retro1:8787 retro2:8787 {
    lb_policy query room
    health_uri /healthz
  }
}
```

```nginx
# nginx (http block); keep the WebSocket headers of your usual proxy_pass
upstream retroboard {
  hash $arg_room consistent;
  server retro1:8787;
  server retro2:8787;
}
server {
  listen 443 ssl;
  server_name retro.example.com;
  location / {
    proxy_pass http://retroboard;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade; # map $http_upgrade $connection_upgrade { default upgrade; '' close; }
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_read_timeout 120s;
  }
}
```

```haproxy
# HAProxy
backend retroboard
  balance url_param room
  hash-type consistent
  server retro1 retro1:8787 check
  server retro2 retro2:8787 check
```

When the pool changes (an instance added or removed) the rooms that move are dropped and rebuilt by their participants, as after a restart.

## Notes

* Pin an exact tag (`1.3.0`) for stable deployments; `latest` follows every release.
* The container runs as a non-root user and answers `/healthz`; `node scripts/smoke.mjs https://retro.example.com` checks a running instance.
* The image is scanned, signed and attested like every release image ([deploy runbook](runbooks/deploy.md)).
* Direct links (WebRTC) use a STUN server, `stun.cloudflare.com` by default, so that server sees the participants' addresses. Replace it with your own through `NUXT_PUBLIC_ICE_SERVERS` at build time (`docker build`), and the privacy page already speaks of "the STUN server" on a configured instance.
* Whether it is suitable for large public instances is not verified; it is meant for teams and small instances (a verifier before wider use).
* Releases, versions and the image build: ADR-0025.

## Build it yourself

```bash
docker build -t retroboard --build-arg VERSION=dev .
docker build --target workerd -t retroboard:workerd .   # the previous workerd image
```
