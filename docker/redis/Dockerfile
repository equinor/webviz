# Custom Redis image that accepts the server password via the REDIS_REQUIREPASS environment variable.
#
# Usage:
#   Set REDIS_REQUIREPASS to the desired password when running the container. Additional redis-server options can be
#   appended via the CMD / docker-compose command: field; they are applied as command-line overrides after the config
#   file, which is standard Redis behaviour.

FROM redis:7.2.14

COPY docker/redis/custom-docker-entrypoint.sh /custom-docker-entrypoint.sh
RUN chmod +x /custom-docker-entrypoint.sh

ENTRYPOINT ["/custom-docker-entrypoint.sh"]
