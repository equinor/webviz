#!/usr/bin/env bash
#
# Install the Sumo shared key into the running backend-primary container so that e2e/codegen
# sessions (which authenticate with the SENTINEL_ACCESS_TOKEN_FOR_TESTING sentinel) can fetch real
# Sumo data. This is the single source of truth for that step, shared by developers and the
# .github/workflows/e2e_recordings.yml CI job.
#
# The key is read from an environment variable so the secret never has to be pasted on the command
# line. In a Codespace, add it as a Codespace secret named SHARED_KEY_DROGON_READ_PROD; it is then
# available in the terminal environment.
#
# Usage (from the repo root or anywhere; paths are resolved relative to this script):
#   SHARED_KEY_DROGON_READ_PROD=<key> ./frontend/tests/e2e/setup/install-sumo-shared-key.sh
#   # or, if the Codespace secret is already exported:
#   ./frontend/tests/e2e/setup/install-sumo-shared-key.sh

set -euo pipefail

# Sumo application id whose shared key the backend expects (filename is "<app-id>.sharedkey").
SUMO_APP_ID="9e5443dd-3431-4690-9617-31eed61cb55a"
KEY_ENV_VAR="${SUMO_SHARED_KEY_ENV_VAR:-SHARED_KEY_DROGON_READ_PROD}"
SHARED_KEY="${!KEY_ENV_VAR:-}"

if [ -z "${SHARED_KEY}" ]; then
    echo "Error: environment variable '${KEY_ENV_VAR}' is empty or unset." >&2
    echo "Set it (e.g. as a Codespace secret) to the Sumo prod shared key and re-run." >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

# Run docker compose from the repo root. Honor an externally provided COMPOSE_FILE (e.g. CI stacks
# the cosmos-db override onto it); otherwise default to the repo's docker-compose.yml.
cd "${REPO_ROOT}"
compose() {
    if [ -n "${COMPOSE_FILE:-}" ]; then
        docker compose "$@"
    else
        docker compose -f "${REPO_ROOT}/docker-compose.yml" "$@"
    fi
}

KEY_DIR="/home/appuser/.sumo"
KEY_PATH="${KEY_DIR}/${SUMO_APP_ID}.sharedkey"

# Pipe the key straight into a file inside the container so it never touches the host disk.
compose exec -T backend-primary mkdir -p "${KEY_DIR}"
printf '%s' "${SHARED_KEY}" | compose exec -T backend-primary sh -c "cat > '${KEY_PATH}'"

# The backend runs as appuser; make sure it owns and can only-read the key.
compose exec -T -u root backend-primary chown appuser:appuser "${KEY_PATH}"
compose exec -T -u root backend-primary chmod 600 "${KEY_PATH}"

echo "Installed Sumo shared key at ${KEY_PATH} in the backend-primary container."
