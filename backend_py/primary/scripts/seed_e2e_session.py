"""Seed an authenticated session into the Redis auth store for end-to-end (e2e) testing.

This utility is meant to be run *inside the running backend-primary container* (where the
backend Python environment, the encryption key and the Redis auth store are all available),
typically piped in by the Playwright e2e global-setup:

    docker compose exec -T backend-primary python - < scripts/seed_e2e_session.py

It creates a server-side session whose Sumo access token is the sentinel value
``DUMMY_TOKEN_FOR_TESTING``. The backend's ``create_sumo_client()`` treats that sentinel as a
request to build a ``SumoClient(interactive=False)`` instance, which authenticates against Sumo
using the shared key on disk (``~/.sumo/<id>.sharedkey``). This is the exact same mechanism the
backend integration tests use to read real Drogon data, so the seeded session lets the frontend
behave as a logged-in user fetching real Sumo data *without* going through interactive Microsoft
OAuth.

The script prints a single line of JSON to stdout describing the cookie to set, e.g.:

    {"cookieName": "session", "sessionId": "abc123...", "sumoToken": "DUMMY_TOKEN_FOR_TESTING"}

All human-readable logging goes to stderr so stdout stays machine-parsable.

IMPORTANT: This only ever yields data in an environment that already has the Fernet key, Redis
access and the Sumo shared key present (i.e. a test environment). It adds no HTTP surface to the
application and is not imported by the application itself.
"""

import asyncio
import json
import secrets
import sys
import time

# These imports rely on the backend Python environment, hence the script must run in-container.
from primary import config
from primary.auth.auth_helper import _TokenEntry, _UserAuthInfo
from primary.middleware.encrypted_redis_session_store import EncryptedRedisSessionStore

# Must match the SessionMiddleware cookie name configured in primary.main (starsessions default).
_COOKIE_NAME = "session"

# Must match the Redis key prefix configured for the auth session store in primary.main.
_REDIS_KEY_PREFIX = "auth-sessions:"

# The sentinel Sumo token recognised by create_sumo_client() to fall back to the on-disk
# shared key instead of a real user access token.
_SENTINEL_SUMO_TOKEN = "DUMMY_TOKEN_FOR_TESTING"  # nosec B105 - not a real secret

# How long the seeded identity/token should be considered valid. get_authenticated_user() only
# accepts the session if it expires more than 5 minutes into the future, so we use a long window.
_SESSION_VALID_SECONDS = 30 * 24 * 3600  # 30 days


def _log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _build_user_auth_info() -> _UserAuthInfo:
    expires_at = int(time.time()) + _SESSION_VALID_SECONDS
    return _UserAuthInfo(
        user_id="e2e-test-user",
        user_name="e2e-test-user@webviz.test",
        user_identity_expires_at=expires_at,
        access_tokens={
            "sumo": _TokenEntry(token=_SENTINEL_SUMO_TOKEN, expires_at=expires_at),
        },
        earliest_expiry_time=expires_at,
    )


def _build_session_payload(user_auth_info: _UserAuthInfo) -> bytes:
    # Mirror exactly what starsessions' JsonSerializer would write for this session. The auth
    # helper stores the user auth info as a JSON *string* under the "user_auth_info" key, and
    # starsessions augments the session with a "__metadata__" entry.
    now = time.time()
    session_dict = {
        "user_auth_info": user_auth_info.model_dump_json(),
        "__metadata__": {
            "lifetime": 0,
            "created": now,
            "last_access": now,
        },
    }
    return json.dumps(session_dict).encode("utf-8")


async def _seed_session_async() -> str:
    session_id = secrets.token_hex(16)

    store = EncryptedRedisSessionStore(
        fernet_key=config.SESSION_STORE_FERNET_KEY,
        redis_url=config.REDIS_AUTH_STORE_URL,
        prefix=_REDIS_KEY_PREFIX,
    )

    payload = _build_session_payload(_build_user_auth_info())

    # lifetime=0 makes the underlying RedisStore fall back to its gc_ttl (30 days), so the
    # seeded session will not be evicted during a test run.
    await store.write(session_id=session_id, data=payload, lifetime=0, ttl=0)

    return session_id


def main() -> None:
    _log("Seeding e2e authenticated session into Redis auth store...")
    session_id = asyncio.run(_seed_session_async())
    _log(f"Seeded session with id starting {session_id[:8]}... (Sumo token: sentinel/shared-key)")

    # Machine-readable result on stdout (single line) for the Playwright global-setup to consume.
    print(
        json.dumps(
            {
                "cookieName": _COOKIE_NAME,
                "sessionId": session_id,
                "sumoToken": _SENTINEL_SUMO_TOKEN,
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
