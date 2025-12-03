import logging

from azure.identity.aio import DefaultAzureCredential
from azure.servicebus.aio import ServiceBusClient
from azure.servicebus.aio import ServiceBusSender
from azure.servicebus import ServiceBusMessage

LOGGER = logging.getLogger(__name__)


class MessageBus:
    def __init__(self, sb_client: ServiceBusClient):
        self._sb_client: ServiceBusClient = sb_client
        self._sb_senders: dict[str, ServiceBusSender] = {}

    async def _close_async(self) -> None:
        await self._sb_client.close()

    async def send_to_queue_async(self, queue_name: str, body: str) -> None:
        sender = self.get_sender(queue_name=queue_name)
        message = ServiceBusMessage(body)
        await sender.send_messages(message)

    def get_sender(self, queue_name: str) -> ServiceBusSender:
        if queue_name not in self._sb_senders:
            self._sb_senders[queue_name] = self._sb_client.get_queue_sender(queue_name)

        return self._sb_senders[queue_name]


class MessageBusSingleton:
    _message_bus_instance: MessageBus | None = None

    @classmethod
    def initialize_with_credential(cls, fully_qualified_sb_namespace: str, credential: DefaultAzureCredential) -> None:
        if cls._message_bus_instance is not None:
            raise RuntimeError("MessageBusSingleton is already initialized")

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
