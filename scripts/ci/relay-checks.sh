#!/usr/bin/env bash
# Starts one relay target on the generated site and runs the smoke test and the relay contract against it:
#   scripts/ci/relay-checks.sh <workerd|node> [port]
# workerd is `wrangler dev` (the Worker and the Durable Object), node is the Node adapter. Needs `pnpm generate` first.
# Prints the server log on failure and always stops the server.
set -euo pipefail

target=${1:?usage: relay-checks.sh <workerd|node> [port]}
port=${2:-18788}
root=$(cd "$(dirname "$0")/../.." && pwd)
log=$(mktemp)
pid=

cleanup() {
  [ -z "$pid" ] || kill "$pid" 2>/dev/null || true
  rm -f "$log"
}
trap cleanup EXIT

cd "$root"
case "$target" in
  workerd)
    npx wrangler dev --port "$port" --ip 127.0.0.1 >"$log" 2>&1 &
    ;;
  node)
    pnpm --filter @retroboard/relay build:node
    # Every check comes from 127.0.0.1: the per-address caps are off, as in the e2e target.
    PORT=$port HOST=127.0.0.1 PUBLIC_DIR=apps/web/.output/public RATE_LIMIT_PER_MIN=0 MAX_CONNECTIONS_PER_ADDRESS=0 MAX_CONNECTS_PER_MINUTE=0 \
      node apps/relay/dist/node.mjs >"$log" 2>&1 &
    ;;
  *)
    echo "relay-checks: unknown target '$target' (workerd or node)" >&2
    exit 2
    ;;
esac
pid=$!

fail() {
  echo "::error::$1 ($target)"
  tail -n 50 "$log"
  exit 1
}

for _ in $(seq 1 60); do
  curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1 && break
  kill -0 "$pid" 2>/dev/null || fail "the relay exited before it answered /healthz"
  sleep 2
done
curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1 || fail "the relay did not answer /healthz"

node scripts/smoke.mjs "http://127.0.0.1:$port" || fail "the smoke test failed"
node scripts/relay-contract.mjs "http://127.0.0.1:$port" || fail "the relay contract failed"
echo "relay-checks: $target passed the smoke test and the relay contract"
