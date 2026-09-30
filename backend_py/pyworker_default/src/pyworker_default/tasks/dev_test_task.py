import asyncio
import logging

from azure.servicebus import ServiceBusReceivedMessage

from webviz_server_schemas.pyworker.messages import DevTestMsg

from ..utils import message_decryption
from ..task_exceptions import MalformedMessageError


_logger = logging.getLogger(__name__)


async def dev_test_task_async(sb_msg: ServiceBusReceivedMessage) -> None:
    _logger.info(f"dev_test_task_async(): Parsing and decrypting DevTestMsg: {sb_msg.message_id=}, {sb_msg.sequence_number=}")

    try:
        body_bytes = b"".join(sb_msg.body)
        msg = DevTestMsg.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to parse message: {repr(exc)}") from exc

    try:
        decrypted_text = message_decryption.decrypt_data_to_str(msg.encrypted_text)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to decrypt text: {repr(exc)}") from exc

    _logger.info(f"dev_test_task_async(): Message payload: {msg.text=}, {decrypted_text=}")

    # Sleep a bit to simulate work
    _logger.info(f"dev_test_task_async(): Sleeping {msg.sleep_duration_s} seconds to simulate fake processing...")
    await asyncio.sleep(msg.sleep_duration_s)

    if msg.text == "crash":
        _logger.info("dev_test_task_async(): Crashing as requested by message")
        raise RuntimeError("Intentional crash triggered by 'crash' message text")

    _logger.info("dev_test_task_async(): Fake processing done")
