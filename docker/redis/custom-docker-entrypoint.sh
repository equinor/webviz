#!/bin/sh
# Custom entrypoint for the webviz Redis image (see Dockerfile for background).
#
# Reads the Redis password from the REDIS_REQUIREPASS environment variable and writes it to a temporary config file
# before handing off to the official Redis entrypoint. Writing to a file instead of passing --requirepass on the
# command line prevents the password from appearing in process listings such as ps.
set -e

echo "Starting ephemeral Redis with password from environment variable"
echo "  * No RDB/AOF persistence"
echo "  * Password from REDIS_REQUIREPASS environment variable"

if [ -z "$REDIS_REQUIREPASS" ]; then
    echo "Error: REDIS_REQUIREPASS environment variable is not set" >&2
    exit 1
fi

# Write our default config and the password to a temp config file
umask 077
REDIS_CONF_FILE="$(mktemp)"
cat > "$REDIS_CONF_FILE" <<EOF
requirepass "$REDIS_REQUIREPASS"
save ""
appendonly no
logfile ""
EOF

echo "Additional Redis command-line arguments: $*"
echo "---"

# Any extra args (from docker-compose command:) are passed as command-line overrides
# after the config file, which is standard Redis behaviour.
exec docker-entrypoint.sh redis-server "$REDIS_CONF_FILE" "$@"
