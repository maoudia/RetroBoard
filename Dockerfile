# syntax=docker/dockerfile:1
# RetroBoard container image: the static site and the memory-only relay, run by the Node adapter (ADR-0036).
# Two targets: the default (last stage) is the Node adapter; `--target workerd` builds the previous image, run by the
# local workerd runtime, kept as the `:workerd` tag for one release as a fallback.
# Self-hosting notes: docs/self-hosting.md. Built and published for each release (.github/workflows/release.yml).

# Build stage: install, generate the static site, bundle the Node adapter.
FROM node:26-slim AS build
ENV CI=1
WORKDIR /src
# Node 25 and later no longer ship corepack: install it, it then fetches the pnpm of package.json.
RUN npm install --global --no-audit --no-fund corepack@latest && corepack enable
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm generate \
 && pnpm --filter @retroboard/relay build:node \
 && mkdir -p /out/dist \
 && cp -r apps/web/.output/public /out/public \
 && cp apps/relay/dist/node.mjs /out/dist/node.mjs \
 && node -e "console.log(require('./apps/relay/package.json').dependencies.ws)" > /out/ws.version

# The Worker bundle, only for the workerd target.
FROM build AS worker-build
RUN pnpm exec wrangler deploy --dry-run --outdir /out/worker \
 && cp deploy/selfhost/wrangler.jsonc /out/wrangler.jsonc \
 && node -e "console.log(require('./package.json').devDependencies.wrangler.replace(/^[^0-9]*/, ''))" > /out/wrangler.version

# Runtime stage of the fallback image: only Wrangler (which ships workerd) and the built files.
FROM node:26-slim AS workerd
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="RetroBoard" \
      org.opencontainers.image.description="End-to-end encrypted retrospective boards: static site and memory-only relay" \
      org.opencontainers.image.source="https://github.com/maoudia/RetroBoard" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
ENV NODE_ENV=production \
    WRANGLER_SEND_METRICS=false \
    CLOUDFLARE_SEND_METRICS=false \
    WRANGLER_HOME=/tmp/wrangler \
    XDG_CONFIG_HOME=/tmp/config
WORKDIR /app
COPY --from=build /out/public /app/public
COPY --from=worker-build /out/worker /app/worker
COPY --from=worker-build /out/wrangler.jsonc /out/wrangler.version /app/
# The base image ships npm with its own dependencies (undici, ip-address...) that the scan reports and the relay never
# runs: npm is used once to install Wrangler, then removed, and the container starts Wrangler directly.
# ca-certificates: the slim base ships none and workerd aborts at start without a system CA bundle.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && apt-get install -y --no-install-recommends --only-upgrade zlib1g \
 && rm -rf /var/lib/apt/lists/* \
 && echo '{"private":true}' > package.json \
 && npm install --no-audit --no-fund --omit=dev "wrangler@$(cat wrangler.version)" \
 && rm -rf /root/.npm /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
 && chown -R node:node /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node_modules/.bin/wrangler", "dev", "--local", "--ip", "0.0.0.0", "--port", "8787", "--persist-to", "/tmp/state"]

# Runtime stage (default): the site, the bundled adapter and `ws`, nothing else.
FROM node:26-slim
ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.title="RetroBoard" \
      org.opencontainers.image.description="End-to-end encrypted retrospective boards: static site and memory-only relay" \
      org.opencontainers.image.source="https://github.com/maoudia/RetroBoard" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"
# Same values as deploy/selfhost/relay.env. TLS ends at the reverse proxy in front of the container; all clients share
# one address behind it, so the per-address page limit is off and CLIENT_IP_HEADER stays unset (docs/self-hosting.md).
ENV NODE_ENV=production \
    SELF_HOSTED=1 \
    RATE_LIMIT_PER_MIN=0 \
    PORT=8787 \
    HOST=0.0.0.0
WORKDIR /app
COPY --from=build /out/public /app/public
COPY --from=build /out/dist /app/dist
COPY --from=build /out/ws.version /app/ws.version
# The base image ships npm with its own dependencies (undici, ip-address...) that the scan reports and the relay never
# runs: npm is used once to install `ws` (no transitive dependency), then removed, and the container starts Node directly.
RUN apt-get update \
 && apt-get install -y --no-install-recommends --only-upgrade zlib1g \
 && rm -rf /var/lib/apt/lists/* \
 && echo '{"private":true,"type":"module"}' > package.json \
 && npm install --no-audit --no-fund --omit=dev "ws@$(cat ws.version)" \
 && rm -rf /root/.npm ws.version /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
 && chown -R node:node /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/node.mjs"]
