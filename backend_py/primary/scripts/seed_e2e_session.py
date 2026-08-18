"""Seed an authenticated session into the Redis auth store for end-to-end (e2e) testing.

This utility is meant to be run *inside the running backend-primary container* (where the
backend Python environment, the encryption key and the Redis auth store are all available),
typically piped in by the Playwright e2e global-setup:

    docker compose exec -T backend-primary python - < scripts/seed_e2e_session.py

The script prints a single line of JSON to stdout describing the cookie to set, e.g.:

    {"cookieName": "session", "sessionId": "abc123...", "sumoToken": "DUMMY_TOKEN_FOR_TESTING"}

"""

import asyncio
import json
import secrets
import sys
import time

from primary import config
from primary.auth.auth_helper import _TokenEntry, _UserAuthInfo
from primary.middleware.encrypted_redis_session_store import EncryptedRedisSessionStore
from webviz_services.sumo_access.sumo_client_factory import SENTINEL_ACCESS_TOKEN_FOR_TESTING

# Must match the SessionMiddleware cookie name (starsessions default is "session").
_COOKIE_NAME = "session"


def _build_user_auth_info() -> _UserAuthInfo:
    expires_at = int(time.time()) + 30 * 24 * 3600  # 30 days
    return _UserAuthInfo(
        user_id="e2e-test-user",
        user_name="e2e-test-user@webviz.test",
        user_identity_expires_at=expires_at,
        access_tokens={
            "sumo": _TokenEntry(token=SENTINEL_ACCESS_TOKEN_FOR_TESTING, expires_at=expires_at),
        },
        earliest_expiry_time=expires_at,
    )


def _build_session_payload(user_auth_info: _UserAuthInfo) -> bytes:
    # Mirrors what starsessions' JsonSerializer would write for a session
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
        prefix=config.AUTH_SESSION_STORE_PREFIX,
    )

    payload = _build_session_payload(_build_user_auth_info())

    await store.write(session_id=session_id, data=payload, lifetime=0, ttl=0)

    return session_id


def main() -> None:
    session_id = asyncio.run(_seed_session_async())

    # Machine-readable result on stdout (single line) for the Playwright globalSetup to consume:
    print(
        json.dumps(
            {
                "cookieName": _COOKIE_NAME,
                "sessionId": session_id,
                "sumoToken": SENTINEL_ACCESS_TOKEN_FOR_TESTING,
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
