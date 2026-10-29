# Self-hosting

Each release publishes a container image: `ghcr.io/maoudia/retroboard` (tags `X.Y.Z`, `X.Y`, `X`, `latest`; linux/amd64 and linux/arm64). It serves the site and the relay on port 8787. Nothing is stored: boards live in the browsers and the relay only forwards encrypted messages (ADR-0020).

```bash
docker run --rm -p 8787:8787 ghcr.io/maoudia/retroboard:latest
# open http://localhost:8787
```

## Behind a reverse proxy

Browsers need HTTPS for end-to-end encryption (WebCrypto), except on `localhost`. Put the container behind a proxy that terminates TLS and forwards WebSockets (path `/ws2`). The image sets `SELF_HOSTED=1`, so it does not redirect plain HTTP to HTTPS, and `RATE_LIMIT_PER_MIN=0`, because every visitor shares the proxy address.

```caddyfile
retro.example.com {
  reverse_proxy retroboard:8787
}
```

## Notes

* Pin an exact tag (`1.3.0`) for stable deployments; `latest` follows every release.
* The container runs as a non-root user and answers `/healthz`.
* The runtime is the local workerd runtime started by Wrangler (`wrangler dev --local`). It is the same Worker code as the hosted service. Whether it is suitable for large public instances is not verified; it is meant for teams and small instances (a verifier before wider use).
* Releases, versions and the image build: ADR-0025.

## Build it yourself

```bash
docker build -t retroboard --build-arg VERSION=dev .
```
