import logging
from dataclasses import dataclass
from typing import Awaitable, Callable

from azure.servicebus import ServiceBusReceivedMessage

from webviz_services.utils.task_meta_tracker import TaskMetaTracker, TaskState, get_task_meta_tracker_for_user_id
from webviz_server_schemas.pyworker.messages import UserTaskMsgHeader

from .task_exceptions import TaskFailedError, TaskDeferredError, MalformedMessageError
from .utils.abort_signal import AbortSignal
from .utils.worker_logging import LogScope


_logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TaskSuccess:
    status_message: str | None = None

# A task work function performs the actual work for a single message. It receives the task tracker, the raw Service Bus
# message and an abort signal.
# On success it returns a TaskSuccess (optionally carrying an end-user status message stored as the final status).
# It signals other outcomes by raising an exception (see task_exceptions for the full taxonomy):
UserTaskWorkFn = Callable[[TaskMetaTracker, ServiceBusReceivedMessage, AbortSignal], Awaitable[TaskSuccess]]


async def run_tracked_user_task_async(sb_msg: ServiceBusReceivedMessage, work_fn: UserTaskWorkFn, abort_signal: AbortSignal) -> None:
    """
    Owns the task lifecycle and maps the work outcome onto the task state. 
    Message settlement is performed in process_message_async, based on any exception that propagates out of here:
    
      | Outcome of work_fn                      | Task state| Message settlement |
      |-----------------------------------------|-----------|--------------------|
      | Returns normally                        | SUCCEEDED | complete           |
      | Raises TaskFailedError                  | FAILED    | complete           |
      | Raises TaskDeferredError (retry/abort)  | untouched | abandon / retry    |
      | Raises TaskInternalError / other        | FAILED    | dead-letter        |
    
    Note: The task state is always recorded before the exception propagates, so the message is never settled before
    the outcome has been written as task state.
    """

    # Peek to get hold of the user_id and task_id for logging and task tracking purposes
    header = _peek_user_task_header(sb_msg)

    with LogScope(task_id=header.task_id):
        task_tracker = get_task_meta_tracker_for_user_id(header.user_id)

        await task_tracker.set_state_async(header.task_id, TaskState.RUNNING)

        try:
            success = await work_fn(task_tracker, sb_msg, abort_signal)
            await task_tracker.set_state_async(header.task_id, TaskState.SUCCEEDED, status_message=success.status_message)

        except TaskFailedError as exc:
            # Final, user-facing failure: record FAILED, then re-raise so the message is COMPLETED.
            await task_tracker.fail_task_async(header.task_id, status_message=exc.status_message, internal_error_message=exc.internal_error_message)
            raise

        except TaskDeferredError:
            # Transient failure or cooperative shutdown: leave the task untouched and let caller settle message
            raise

        except Exception as exc:
            # TaskInternalError or any unexpected error: record FAILED, then re-raise so the message is dead-lettered for inspection.
            await task_tracker.fail_task_async(header.task_id, status_message="Task failed due to an error", internal_error_message=repr(exc))
            raise


def _peek_user_task_header(sb_msg: ServiceBusReceivedMessage) -> UserTaskMsgHeader:
    try:
        body_bytes = b"".join(sb_msg.body)
        return UserTaskMsgHeader.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to extract user/task header from message: {repr(exc)}") from exc


