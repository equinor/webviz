import asyncio
import logging

from azure.servicebus import ServiceBusReceivedMessage


_logger = logging.getLogger(__name__)


async def dummy_task_async(sb_msg: ServiceBusReceivedMessage) -> None:
    body_bytes = b"".join(sb_msg.body)
    body_text = body_bytes.decode("utf-8")
    _logger.info(f"Got message: [{sb_msg.message_id=}, {sb_msg.sequence_number=}]: {body_text=}")

    # Sleep a bit to simulate work
    _logger.info(f"Sleeping 5 seconds to simulate work... [{sb_msg.message_id=}, {sb_msg.sequence_number=}]: {body_text=}")
    await asyncio.sleep(5.0)

    if body_text == "crash":
        _logger.info("Crashing as requested by message")
        raise RuntimeError("Intentional crash triggered by 'crash' message")

    _logger.info(f"Fake processing done [{sb_msg.message_id=}, {sb_msg.sequence_number=}]: {body_text=}")



