#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$BACKEND_PY_DIR"

echo "Running using python interpreter at:"
which python

status=0

for path in \
    libs/core_utils \
    libs/server_schemas \
    libs/services \
    primary 
do
    echo
    echo "Refreshing lockfile in: $path"
    poetry lock --directory=$path
done

exit "$status"