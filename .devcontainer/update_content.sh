#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# System packages (ffmpeg, Python, ...) are installed in .devcontainer/Dockerfile
# so they are cached by GitHub Codespaces prebuilds.

echo "=== Ensuring .env with Azure credentials exists ==="
ensure_env_var() {
  local key="$1"
  local value="$2"
  if ! grep -qE "^${key}=" .env 2>/dev/null; then
    echo "${key}=${value}" >>.env
    echo "Added ${key} to .env"
  fi
}
ensure_env_var "AZURE_TENANT_ID" "3aa4a235-b6e2-48d5-9195-7fcf05b459b0"
ensure_env_var "AZURE_CLIENT_ID" "6e4f6e15-5b73-40e7-835e-f563fabd604a"

echo "=== Installing frontend dependencies ==="
npm ci --prefix ./frontend

echo "=== Installing Playwright browser ==="
(cd frontend && npx playwright install --with-deps chromium)

echo "=== Dev container setup complete ==="
