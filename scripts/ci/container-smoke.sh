#!/usr/bin/env bash
# Runs a built RetroBoard image and smoke tests it: scripts/ci/container-smoke.sh <image> [port]
# Waits for /healthz, runs scripts/smoke.mjs against the container, prints the container log on failure, always removes it.
set -euo pipefail

image=${1:?usage: container-smoke.sh <image> [port]}
port=${2:-18787}
name="retroboard-smoke-$$"

cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$name" -p "127.0.0.1:$port:8787" "$image" >/dev/null

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$port/healthz" >/dev/null 2>&1; then
    node "$(dirname "$0")/../smoke.mjs" "http://127.0.0.1:$port" && exit 0
    echo "::error::the smoke test failed against $image"
    docker logs "$name" 2>&1 | tail -n 50
    exit 1
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$name")" != "true" ]; then break; fi
  sleep 2
done

echo "::error::$image did not answer /healthz"
docker logs "$name" 2>&1 | tail -n 50
exit 1
