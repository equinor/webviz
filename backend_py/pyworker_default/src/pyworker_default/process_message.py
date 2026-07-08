import logging
import traceback

from azure.servicebus.aio import ServiceBusReceiver
from azure.servicebus import ServiceBusReceivedMessage
from opentelemetry.propagate import extract
from opentelemetry.context import Context
from opentelemetry import trace

from webviz_server_schemas.pyworker.messages import WorkerOperation

from .utils.worker_logging import LogScope
from .utils.abort_signal import AbortSignal
from .task_exceptions import TaskFailedError, TaskRetryError, TaskAbortedError, TaskInternalError
from .task_runner import run_tracked_user_task_async
from .tasks.handle_dummy_message import dummy_task_async
from .tasks.handle_create_derived_smry_table import create_derived_smry_table_task_async


_logger = logging.getLogger(__name__)
_tracer = trace.get_tracer(__name__)


async def process_message_async(receiver: ServiceBusReceiver, msg: ServiceBusReceivedMessage, abort_signal: AbortSignal) -> None:
    """
    Processes a single Service Bus message, dispatching to the appropriate handler based on the
    worker operation, which is determined by the 'subject' property of the message.
    """
    _logger.debug(f"process_message_async(): {msg.subject=}, {msg.message_id=}, {msg.sequence_number=}, {msg.delivery_count=}")
    _logger.debug(f"process_message_async(): {msg.enqueued_time_utc=}, {msg.expires_at_utc=}")
    _logger.debug(f"process_message_async(): {msg.application_properties=}")

    parent_otel_ctx: Context = _extract_trace_context_from_message(msg)

    queue_name = receiver.entity_path
    worker_op = msg.subject or "UNKNOWN"
    message_id = msg.message_id or "UNKNOWN"

    with LogScope(queue_name=queue_name, message_id=message_id, worker_op=worker_op):

        with _tracer.start_as_current_span(f"process_message: {worker_op}", context=parent_otel_ctx, kind=trace.SpanKind.CONSUMER) as span:

            _logger.info(f"Processing message: {worker_op=}, {message_id=}, {msg.sequence_number=}, {msg.delivery_count=}")

            span.set_attribute("app.message_queue_name", queue_name)
            span.set_attribute("app.message_id", message_id)
            span.set_attribute("app.worker_op", worker_op)

            try:
                match worker_op:
                    case WorkerOperation.DUMMY:
                        await dummy_task_async(msg)

                    case WorkerOperation.CREATE_DERIVED_SMRY_TABLE:
                        await run_tracked_user_task_async(msg, create_derived_smry_table_task_async, abort_signal)

                    case _:
                        err_msg = f"Unknown worker operation: {worker_op}"
                        span.record_exception(ValueError(err_msg))
                        span.set_status(trace.StatusCode.ERROR)
                        _logger.error(err_msg)
                        await receiver.dead_letter_message(msg, reason="UnknownWorkerOperation", error_description=err_msg)
                        return

                span.set_status(trace.StatusCode.OK)
                await receiver.complete_message(msg)

            # The exception handlers below settle the message based on exception taxonomy (see task_exceptions).
            # We record exceptions on the telemetry span, but avoid doing logger.exception().
            # It looks like Azure Monitor's telemetry instrumentation will pick up the exception from logger.exception()
            # and export that log record as exception telemetry which results in duplicate exception telemetry.
            # We also don't re-raise the exception because we want to fully handle the settlement of messages 
            # here (complete/abandon/dead-letter) and not let the exception propagate further.

            except TaskFailedError as exc:
                # User-facing failure. The task should already be marked FAILED if it is being tracked.
                # Here we complete the message (not dead-lettered) and just log the error.
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR)
                _logger.error(f"Task reported a user-facing failure: {exc.status_message!r}, {repr(exc)}\n{"".join(traceback.format_exception(exc))}")
                await receiver.complete_message(msg)

            except TaskAbortedError as exc:
                # Cooperative shutdown/cancellation, not an error. 
                # Return the message to the queue so it is retried (by another worker or this one after restart).
                # For now log this as warning and don't set a status on the span
                _logger.warning(f"Task aborted due to shutdown, abandoning message for retry: {repr(exc)}")
                await receiver.abandon_message(msg)

            except TaskRetryError as exc:
                # Return message to the queue so it can be retried later (bounded by the queue's maxDeliveryCount).
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR)
                _logger.error(f"Transient failure processing Service Bus message, abandoning for retry: {repr(exc)}\n{"".join(traceback.format_exception(exc))}")
                await receiver.abandon_message(msg)

            except TaskInternalError as exc:
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR)
                _logger.error(f"Internal error processing Service Bus message, sending to DLQ: {repr(exc)}\n{"".join(traceback.format_exception(exc))}")
                await receiver.dead_letter_message(msg, reason="InternalError", error_description=str(exc))

            except Exception as exc:
                span.record_exception(exc)
                span.set_status(trace.StatusCode.ERROR, repr(exc))
                _logger.error(f"Unexpected error processing Service Bus message, sending to DLQ: {repr(exc)}\n{"".join(traceback.format_exception(exc))}")
                await receiver.dead_letter_message(msg, reason="UnexpectedError", error_description=str(exc))


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



