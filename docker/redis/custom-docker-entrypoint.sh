#!/bin/sh
# Custom entrypoint for the webviz Redis image (see Dockerfile for background).
#
# Reads the Redis password from the REDIS_REQUIREPASS environment variable and writes it to a temporary config file
# before handing off to the official Redis entrypoint. Writing to a file instead of passing --requirepass on the
# command line prevents the password from appearing in process listings such as ps.
set -e

echo "Starting Redis with password from REDIS_REQUIREPASS environment variable"

if [ -z "$REDIS_REQUIREPASS" ]; then
    echo "Error: REDIS_REQUIREPASS environment variable is not set" >&2
    exit 1
fi

echo "Writing Redis config with requirepass from REDIS_REQUIREPASS environment variable"

# Write the password to a temp config file
REDIS_CONF=$(mktemp)
printf 'requirepass %s\n' "$REDIS_REQUIREPASS" > "$REDIS_CONF"

echo "Redis config written to $REDIS_CONF"
echo "Starting Redis server with config file $REDIS_CONF"
echo "Additional command-line arguments: $@"

# Any extra args (from docker-compose command:) are passed as command-line overrides
# after the config file, which is standard Redis behaviour.
exec docker-entrypoint.sh redis-server "$REDIS_CONF" "$@"
