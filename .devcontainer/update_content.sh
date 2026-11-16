#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# System packages such as ffmpeg are installed in .devcontainer/Dockerfile, while
# language runtimes are provided by devcontainer features; both are cached by prebuilds.

echo "=== Installing frontend dependencies ==="
npm ci --prefix ./frontend

echo "=== Installing Playwright browser ==="
(cd frontend && npx playwright install --with-deps chromium)

echo "=== Dev container setup complete ==="
