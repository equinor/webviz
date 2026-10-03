#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# System packages (ffmpeg, Python, ...) are installed in .devcontainer/Dockerfile
# so they are cached by GitHub Codespaces prebuilds.

echo "=== Installing frontend dependencies ==="
npm ci --prefix ./frontend

echo "=== Installing Playwright browser ==="
(cd frontend && npx playwright install --with-deps chromium)

# Warm up the backend Docker images in the background so this does not block the
echo "=== Starting Docker image warm-up in background (log: /tmp/webviz-warm-up.log) ==="
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
' > /tmp/webviz-warm-up.log 2>&1 &
disown

echo "=== Dev container setup complete ==="
