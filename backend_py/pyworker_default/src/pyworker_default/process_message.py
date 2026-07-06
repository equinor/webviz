import logging

from azure.servicebus.aio import ServiceBusReceiver
from azure.servicebus import ServiceBusReceivedMessage
from opentelemetry.propagate import extract
from opentelemetry.context import Context
from opentelemetry import trace

from .handle_create_derived_smry_table import create_derived_smry_table_task_async
from .handle_dummy_message import dummy_task_async
from .message_exceptions import MessagePermanentError, MessageRetryableError
from .task_runner import run_tracked_user_task_async
from .utils.worker_logging import LogScope

import traceback

_logger = logging.getLogger(__name__)
_tracer = trace.get_tracer(__name__)


async def process_message_async(receiver: ServiceBusReceiver, msg: ServiceBusReceivedMessage) -> None:
    """
    Processes a single Service Bus message, dispatching to the appropriate handler based on the message type
    which is determined by the 'subject' property of the message.

    """
    _logger.debug(f"process_message_async(): {msg.message_id=}, {msg.sequence_number=}, {msg.delivery_count=}, {msg.subject=}")
    _logger.debug(f"process_message_async(): {msg.enqueued_time_utc=}, {msg.expires_at_utc=}")
    _logger.debug(f"process_message_async(): {msg.application_properties=}")

    parent_otel_ctx: Context = _extract_trace_context_from_message(msg)

    queue_name = receiver.entity_path
    message_type = msg.subject or "UNKNOWN"
    message_id = msg.message_id or "UNKNOWN"

    with LogScope(queue_name=queue_name, message_id=message_id, message_type=message_type):

        with _tracer.start_as_current_span(f"process_message: {message_type}", context=parent_otel_ctx, kind=trace.SpanKind.CONSUMER) as span:

            _logger.info(f"Processing message: {message_id=}, {message_type=}, {msg.sequence_number=}, {msg.delivery_count=}")

            span.set_attribute("app.message_queue_name", queue_name)
            span.set_attribute("app.message_id", message_id)
            span.set_attribute("app.message_type", message_type)

            try:
                match message_type:
                    case "dummy":
                        await dummy_task_async(msg)

                    case "create-derived-smry-table":
                        await run_tracked_user_task_async(msg, create_derived_smry_table_task_async)

                    case _:
                        description = f"Unknown message type: {message_type}"
                        span.record_exception(ValueError(description))
                        span.set_status(trace.StatusCode.ERROR)
                        _logger.error("Unknown Service Bus message type")
                        await receiver.dead_letter_message(msg, reason="UnknownMessageType", error_description=description)
                        return

                span.set_status(trace.StatusCode.OK)
                await receiver.complete_message(msg)

            # In the exception handlers below, we record exceptions on the span, but avoid doing logger.exception().
            # It looks like Azure Monitor's telemetry instrumentation will pick up the exception from logger.exception()
            # and export that log record as exception telemetry which results in duplicate exception telemetry.
            # We also don't re-raise the exception because we want to handle the message appropriately (abandon or dead-letter)
            # and not let the exception propagate further.

            except MessageRetryableError as exc:
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR)
                _logger.error(f"Temporary failure processing Service Bus message, will retry {repr(exc)}")
                # Return message to the queue so it can be retried later, will be retried using queue's retry policy (maxDeliveryCount)
                await receiver.abandon_message(msg)

            except MessagePermanentError as exc:
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR)
                #_logger.error(f"Permanent failure processing Service Bus message, sending to DLQ {repr(exc)}", extra={"message_type": message_type, "message_id": msg.message_id})
                #_logger.error(f"AS ERROR {repr(exc)}", extra={"message_type": message_type, "message_id": msg.message_id})
                _logger.error(f"AS ERROR USING TRACEBACK {repr(exc)}\n{"".join(traceback.format_exception(exc))}")
                #_logger.error(f"AS ERROR WITH EXCEPTION {repr(exc)}", exc_info=exc, extra={"message_type": message_type, "message_id": msg.message_id})
                #_logger.exception(f"AS EXCEPTION {repr(exc)}", extra={"message_type": message_type, "message_id": msg.message_id})
                await receiver.dead_letter_message(msg, reason="PermanentFailure", error_description=str(exc))

            except Exception as exc:
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR, repr(exc))
                _logger.error(f"Unexpected error processing Service Bus message, sending to DLQ {repr(exc)}")
                await receiver.dead_letter_message(msg, reason="PermanentFailure", error_description=str(exc))


def _extract_trace_context_from_message(message: ServiceBusReceivedMessage) -> Context:
    """
    Extracts the trace context from the Service Bus message's application properties and returns an OpenTelemetry Context.
    Note the that the keys and values may be bytes, so we need to handle those cases.
    """
    props = {}
    for k, v in (message.application_properties or {}).items():
        key = k.decode() if isinstance(k, bytes) else k
        value = v.decode() if isinstance(v, bytes) else v
        props[key] = value

    return extract(props)



