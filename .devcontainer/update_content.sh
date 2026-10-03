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

echo "=== Dev container setup complete ==="
