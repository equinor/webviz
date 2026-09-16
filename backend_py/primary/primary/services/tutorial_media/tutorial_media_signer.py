import asyncio
import datetime
import logging
from urllib.parse import urlparse

from azure.core.credentials_async import AsyncTokenCredential
from azure.storage.blob import ContainerSasPermissions, UserDelegationKey, generate_container_sas
from azure.storage.blob.aio import BlobServiceClient

LOGGER = logging.getLogger(__name__)

# User delegation keys are valid for up to 7 days; we refresh ours well before expiry.
_DELEGATION_KEY_TTL = datetime.timedelta(hours=24)
_DELEGATION_KEY_REFRESH_MARGIN = datetime.timedelta(hours=1)

# SAS URLs handed to the browser are intentionally long-lived to cover a full working session.
_SAS_TTL = datetime.timedelta(hours=4)

# Tolerance for clock skew between this host and Azure Storage.
_CLOCK_SKEW_MARGIN = datetime.timedelta(minutes=5)


class TutorialMediaSigner:
    """Mints short-lived, read-only user-delegation SAS URLs for tutorial media blobs.

    Uses the application's Entra identity (no storage account key) to obtain a user-delegation key,
    which is cached and reused to sign individual blob URLs.
    """

    def __init__(self, account_url: str, container_name: str, credential: AsyncTokenCredential) -> None:
        self._account_url = account_url.rstrip("/")
        self._container_name = container_name
        self._account_name = urlparse(self._account_url).hostname.split(".")[0]  # type: ignore[union-attr]
        self._service_client = BlobServiceClient(account_url=self._account_url, credential=credential)
        self._delegation_key: UserDelegationKey | None = None
        self._delegation_key_expiry: datetime.datetime | None = None
        self._lock = asyncio.Lock()

    async def _get_delegation_key_async(self) -> UserDelegationKey:
        now = datetime.datetime.now(datetime.timezone.utc)
        async with self._lock:
            if (
                self._delegation_key is not None
                and self._delegation_key_expiry is not None
                and now < self._delegation_key_expiry - _DELEGATION_KEY_REFRESH_MARGIN
            ):
                return self._delegation_key

            key_start = now - _CLOCK_SKEW_MARGIN
            key_expiry = now + _DELEGATION_KEY_TTL
            LOGGER.info("Requesting new user-delegation key for tutorial media signing")
            self._delegation_key = await self._service_client.get_user_delegation_key(key_start, key_expiry)
            self._delegation_key_expiry = key_expiry
            return self._delegation_key

    async def get_container_read_sas_token_async(self) -> str:
        """Return a read-only, container-scoped SAS token for the tutorial media container.

        The token is appended by the frontend to the (non-sensitive) blob URLs from the manifest.
        """
        delegation_key = await self._get_delegation_key_async()
        now = datetime.datetime.now(datetime.timezone.utc)
        return generate_container_sas(
            account_name=self._account_name,
            container_name=self._container_name,
            user_delegation_key=delegation_key,
            permission=ContainerSasPermissions(read=True),
            start=now - _CLOCK_SKEW_MARGIN,
            expiry=now + _SAS_TTL,
        )

    async def close_async(self) -> None:
        await self._service_client.close()


class TutorialMediaSignerSingleton:
    _instance: TutorialMediaSigner | None = None

    @classmethod
    def initialize(cls, account_url: str, container_name: str, credential: AsyncTokenCredential) -> None:
        cls._instance = TutorialMediaSigner(account_url, container_name, credential)

    @classmethod
    def get_instance(cls) -> TutorialMediaSigner | None:
        return cls._instance

    @classmethod
    async def shutdown_async(cls) -> None:
        if cls._instance is not None:
            await cls._instance.close_async()
            cls._instance = None
