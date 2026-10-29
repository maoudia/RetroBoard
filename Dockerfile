# syntax=docker/dockerfile:1
# RetroBoard container image: the static site and the memory-only relay, run by the local workerd runtime.
# Self-hosting notes: docs/self-hosting.md. Built and published for each release (.github/workflows/release.yml).

# Build stage: install, generate the static site, bundle the Worker.
FROM node:24-slim AS build
ENV CI=1
WORKDIR /src
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm generate \
 && pnpm exec wrangler deploy --dry-run --outdir /out/worker \
 && cp -r apps/web/.output/public /out/public \
 && cp deploy/selfhost/wrangler.jsonc /out/wrangler.jsonc \
 && node -e "console.log(require('./package.json').devDependencies.wrangler.replace(/^[^0-9]*/, ''))" > /out/wrangler.version

# Runtime stage: only Wrangler (which ships workerd) and the built files.
FROM node:24-slim
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
COPY --from=build /out/ /app/
RUN echo '{"private":true}' > package.json \
 && npm install --no-audit --no-fund --omit=dev "wrangler@$(cat wrangler.version)" \
 && rm -rf /root/.npm \
 && chown -R node:node /app
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["npx", "wrangler", "dev", "--local", "--ip", "0.0.0.0", "--port", "8787", "--persist-to", "/tmp/state"]
