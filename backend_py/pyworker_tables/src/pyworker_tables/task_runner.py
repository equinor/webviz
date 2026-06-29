import logging
from typing import Awaitable, Callable

from azure.servicebus import ServiceBusReceivedMessage

from webviz_services.utils.task_meta_tracker import TaskMetaTracker, TaskState, get_task_meta_tracker_for_user_id
from webviz_server_schemas.pyworker.messages import UserTaskMsgHeader

from .message_exceptions import MessagePermanentError, MessageRetryableError
from .utils.worker_logging import LogScope


_logger = logging.getLogger(__name__)


class TaskFailedError(Exception):
    """Definitive, user-facing task failure.

    The task is marked FAILED and the message is COMPLETED (not retried, not dead-lettered).
    Raise this from a task work function for business failures where there is nothing more to do
    and a retry would not help (e.g. a referenced resource does not exist).
    """

    def __init__(self, status_message: str, internal_error_message: str | None = None) -> None:
        super().__init__(status_message)
        self.status_message = status_message
        self.internal_error_message = internal_error_message


# A task work function performs the actual work for a single message. It receives the task tracker
# and the raw Service Bus message. On success it returns an optional end-user status message that is
# stored as the final status. It signals failures by raising:
#   - TaskFailedError       -> task FAILED, message completed (no retry, no dead-letter)
#   - MessageRetryableError -> task untouched, message abandoned (retried)
#   - MessagePermanentError -> task FAILED, message dead-lettered
#   - any other Exception   -> task FAILED, message dead-lettered
TaskWorkFn = Callable[[TaskMetaTracker, ServiceBusReceivedMessage], Awaitable[str | None]]


def _peek_user_task_header(sb_msg: ServiceBusReceivedMessage) -> UserTaskMsgHeader:
    try:
        body_bytes = b"".join(sb_msg.body)
        return UserTaskMsgHeader.model_validate_json(body_bytes)
    except Exception as exc:
        raise MessagePermanentError(f"Failed to extract user/task header from message: {repr(exc)}") from exc


async def run_tracked_user_task_async(sb_msg: ServiceBusReceivedMessage, work_fn: TaskWorkFn) -> None:
    # Owns the task lifecycle and translates the work outcome into task state and message settlement:
    #
    #   | Outcome of work_fn                            | Task      | Message              |
    #   |-----------------------------------------------|-----------|----------------------|
    #   | Returns normally                              | SUCCEEDED | complete (return)    |
    #   | Raises TaskFailedError (business failure)     | FAILED    | complete (return)    |
    #   | Raises MessageRetryableError (transient)      | untouched | abandon/retry (raise)|
    #   | Raises MessagePermanentError / other          | FAILED    | dead-letter (raise)  |
    #
    # Message settlement itself is performed centrally in process_message_async, based on whether an
    # exception propagates out of here (abandon/dead-letter) or not (complete).

    # Peek to get hold of the user_id and task_id for logging and task tracking purposes
    header = _peek_user_task_header(sb_msg)

    with LogScope(task_id=header.task_id):
        task_tracker = get_task_meta_tracker_for_user_id(header.user_id)

        await task_tracker.set_state_async(header.task_id, TaskState.RUNNING)

        try:
            final_status_message = await work_fn(task_tracker, sb_msg)
            await task_tracker.set_state_async(header.task_id, TaskState.SUCCEEDED, status_message=final_status_message)

        except TaskFailedError as exc:
            # Business failure: record FAILED, then COMPLETE the message (return, do not re-raise)
            _logger.error(f"Task failed: {exc.status_message}")
            await task_tracker.fail_task_async(header.task_id, status_message=exc.status_message, internal_error_message=exc.internal_error_message)
            return

        except MessageRetryableError:
            # Transient failure: leave the task untouched and let process_message_async abandon (retry)
            raise

        except Exception as exc:
            # Permanent/unexpected failure: record FAILED, then let it propagate so process_message_async dead-letters
            _logger.exception("Unexpected error running user task")
            await task_tracker.fail_task_async(header.task_id, status_message="Task failed due to an error", internal_error_message=str(exc))
            raise
