#!/usr/bin/env bash

# Warms up the backend Docker images so the first `docker compose up` is fast.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MARKER="${HOME}/.webviz-warm-up.done"
LOG="/tmp/webviz-warm-up.log"

if [[ -f "$MARKER" ]]; then
    exit 0
fi

touch "$MARKER"

echo "=== Starting Docker image warm-up in background (log: ${LOG}) ==="
nohup bash -c '
    cd "'"$REPO_ROOT"'"
    for _ in $(seq 1 60); do
        docker info > /dev/null 2>&1 && break
        sleep 2
    done
    if ! docker info > /dev/null 2>&1; then
        echo "Docker daemon unavailable; skipping image warm-up." >&2
        exit 0
    fi
    docker compose -f docker-compose.yml -f docker-compose-cosmos-db.yml build
' > "$LOG" 2>&1 &
disown
