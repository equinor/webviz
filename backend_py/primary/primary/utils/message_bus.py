import asyncio
import logging
from contextlib import suppress

from azure.core.exceptions import ClientAuthenticationError
from azure.core.credentials_async import AsyncTokenCredential
from azure.servicebus.aio import ServiceBusClient, ServiceBusSender
from azure.servicebus import ServiceBusMessage

LOGGER = logging.getLogger(__name__)


class MessageBus:
    """
    Process-wide Service Bus sender cache.

    NOT safe to share across event loops or threads: the cached ServiceBusClient/senders and the  asyncio.Locks are
    bound to the loop they were first used on.
    Initialize and close this within a single event loop (e.g. the FastAPI app loop via the lifespan handler).
    """

    def __init__(self, sb_client: ServiceBusClient):
        self._sb_client: ServiceBusClient = sb_client
        self._my_loop: asyncio.AbstractEventLoop | None = None

        # We cache one long-lived sender per queue to avoid the ~1s setup overhead on every send.
        self._sb_senders: dict[str, ServiceBusSender] = {}

        # The async ServiceBusSender is NOT coroutine-safe: concurrent sends on a shared sender race and may raise:
        # "Handler failed: 'NoneType' object has no attribute 'client_ready_async'"
        # We therefore serialize access to each queue's sender with a per-queue lock.
        self._sender_locks: dict[str, asyncio.Lock] = {}

    async def _close_async(self) -> None:
        for sender in self._sb_senders.values():
            await sender.close()
        self._sb_senders.clear()

        await self._sb_client.close()

    def _check_loop(self) -> None:
        running = asyncio.get_running_loop()
        if self._my_loop is None:
            self._my_loop = running
        elif self._my_loop is not running:
            raise RuntimeError("MessageBus is bound to a single event loop and cannot be used from another loop")

    async def send_to_queue_async(self, queue_name: str, message: ServiceBusMessage) -> None:
        self._check_loop()

        if queue_name not in self._sender_locks:
            # Create a lock for this queue if it doesn't exist yet.
            self._sender_locks[queue_name] = asyncio.Lock()

        lock = self._sender_locks[queue_name]
        async with lock:
            sender = self._sb_senders.get(queue_name)
            if sender is None:
                sender = self._sb_client.get_queue_sender(queue_name=queue_name)
                self._sb_senders[queue_name] = sender

            try:
                await sender.send_messages(message)
            except Exception:
                # Discard a possibly-broken sender so the next send rebuilds the link.
                self._sb_senders.pop(queue_name, None)
                with suppress(Exception):
                    await sender.close()
                raise

class MessageBusSingleton:
    _message_bus_instance: MessageBus | None = None

    @classmethod
    async def initialize_with_credential_async(
        cls, fully_qualified_sb_namespace: str, credential: AsyncTokenCredential
    ) -> None:
        if cls._message_bus_instance is not None:
            raise RuntimeError("MessageBusSingleton is already initialized")

        # Creation of the client below doesn't actually establish a connection or validate the credential.
        # To try and fail fast if the credential is invalid, we try and get a token from the credential immediately.
        # Note that this check is not exhaustive in the sense that even if it succeeds, there is no guarantee that
        # RBAC permissions are sufficient. The only way to fully verify that is to actually make a call to Service Bus,
        # which we defer until the first time we try to send/receive a message.
        try:
            # Use the scope for Azure Service Bus
            await credential.get_token("https://servicebus.azure.net/.default")
            LOGGER.info("MessageBusSingleton successfully verified Azure credential for Service Bus scope")
        except ClientAuthenticationError as exc:
            raise RuntimeError("Azure authentication failed while acquiring token for Service Bus scope") from exc

        sb_client = ServiceBusClient(fully_qualified_namespace=fully_qualified_sb_namespace, credential=credential)
        cls._message_bus_instance = MessageBus(sb_client)

    @classmethod
    def initialize_with_connection_string(cls, conn_str: str) -> None:
        if cls._message_bus_instance is not None:
            raise RuntimeError("MessageBusSingleton is already initialized")

        sb_client = ServiceBusClient.from_connection_string(conn_str=conn_str)
        cls._message_bus_instance = MessageBus(sb_client)

    @classmethod
    async def shutdown_async(cls) -> None:
        if cls._message_bus_instance is not None:
            # pylint: disable=protected-access
            await cls._message_bus_instance._close_async()
            cls._message_bus_instance = None

    @classmethod
    def get_instance(cls) -> MessageBus:
        if cls._message_bus_instance is None:
            raise RuntimeError("MessageBusSingleton is not initialized, call one of the initialization functions first")

        return cls._message_bus_instance
