import logging
import typing

from cryptography.fernet import Fernet, InvalidToken

from redis.asyncio.client import Redis
from starsessions.stores.base import SessionStore
from starsessions.stores.redis import RedisStore

LOGGER = logging.getLogger(__name__)


class EncryptedRedisSessionStore(SessionStore):
    """A Redis-backed SessionStore with Fernet encryption.

    This class is a thin wrapper around starsessions.RedisStore that adds encryption.
    New fernet keys can be generated using: Fernet.generate_key()

    Args:
        fernet_key: A URL-safe base64-encoded 32-byte Fernet key.
        redis_url: Redis connection URL, e.g. "redis://localhost:6379".
        prefix: Redis key name prefix or callable.
        gc_ttl: TTL (seconds) for sessions with no expiration. Defaults to 30 days.
    """

    def __init__(
        self,
        fernet_key: bytes | str,
        redis_url: str,
        prefix: typing.Callable[[str], str] | str,
        gc_ttl: int = 3600 * 24 * 30,
    ) -> None:
        if isinstance(fernet_key, str):
            fernet_key = fernet_key.encode()
        self._fernet = Fernet(fernet_key)

        redis_client = Redis.from_url(redis_url)
        self._store = RedisStore(connection=redis_client, prefix=prefix, gc_ttl=gc_ttl)

    async def read(self, session_id: str, lifetime: int) -> bytes:
        encrypted_payload = await self._store.read(session_id, lifetime)
        if not encrypted_payload:
            return b""

        try:
            return self._fernet.decrypt(encrypted_payload)
        except InvalidToken:
            # Probably either unencrypted session data or key rotation; treat as missing session.
            LOGGER.warning(f"Failed to decrypt data for session_id={session_id[:8]}, treating as missing session.")
            return b""

    async def write(self, session_id: str, data: bytes, lifetime: int, ttl: int) -> str:
        encrypted_payload = self._fernet.encrypt(data)
        return await self._store.write(session_id, encrypted_payload, lifetime, ttl)

    async def remove(self, session_id: str) -> None:
        await self._store.remove(session_id)
