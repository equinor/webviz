#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Installing system packages ==="
sudo apt-get update
sudo apt-get install -y ffmpeg

echo "=== Installing frontend dependencies ==="
npm ci --prefix ./frontend

echo "=== Installing Playwright browser ==="
(cd frontend && npx playwright install --with-deps chromium)

echo "=== Waiting for the Docker daemon ==="
for _ in $(seq 1 60); do
    if docker info > /dev/null 2>&1; then
        break
    fi
    sleep 2
done

if ! docker info > /dev/null 2>&1; then
    echo "Docker daemon unavailable; skipping image warm-up." >&2
    exit 0
fi

echo "=== Building docker compose images ==="
# Warms the build cache for both the plain and the Cosmos DB compose setups.
docker compose -f docker-compose.yml -f docker-compose-cosmos-db.yml build
docker compose -f docker-compose.yml -f docker-compose-cosmos-db.yml pull cosmos-db-emulator

echo "=== Dev container setup complete ==="
