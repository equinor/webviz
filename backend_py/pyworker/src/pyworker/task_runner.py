import logging
from dataclasses import dataclass
from typing import Awaitable, Callable

from azure.servicebus import ServiceBusReceivedMessage

from webviz_services.utils.task_meta_tracker import TaskMetaTracker, TaskState, get_task_meta_tracker_for_user_id
from webviz_server_schemas.pyworker.messages import UserTaskMsgHeader

from .task_exceptions import TaskFailedError, TaskDeferredError, MalformedMessageError
from .task_exceptions import TaskRetryExhaustedError, TaskTrackingError
from .utils.abort_signal import AbortSignal
from .utils.worker_logging import LogScope

_logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TaskSuccess:
    status_msg: str | None = None


# A task work function performs the actual work for a single message.
# It receives the task tracker, the raw Service Bus message and an abort signal.
# On success it returns a TaskSuccess (optionally carrying an end-user status message stored as the final status).
# It signals other outcomes by raising an exception (see task_exceptions for the full taxonomy):
UserTaskWorkFn = Callable[[TaskMetaTracker, ServiceBusReceivedMessage, AbortSignal], Awaitable[TaskSuccess]]


class TaskStateWriter:
    def __init__(self, task_tracker: TaskMetaTracker, task_id: str) -> None:
        self._task_tracker = task_tracker
        self._task_id = task_id

    async def set_state_async(self, new_state: TaskState, status_msg: str | None = None) -> None:
        if not await self._task_tracker.set_state_async(self._task_id, new_state, status_msg=status_msg):
            raise TaskTrackingError(f"Task metadata missing when recording {new_state.value} ({self._task_id=})")

    async def fail_task_async(self, status_msg: str | None = None, internal_error_msg: str | None = None) -> None:
        if not await self._task_tracker.fail_task_async(
            self._task_id, status_msg=status_msg, internal_error_msg=internal_error_msg
        ):
            raise TaskTrackingError(f"Task metadata missing when recording FAILED ({self._task_id=})")


async def run_tracked_user_task_async(
    sb_msg: ServiceBusReceivedMessage,
    work_fn: UserTaskWorkFn,
    abort_signal: AbortSignal,
    max_delivery_count: int,
) -> None:
    """
    Owns the task lifecycle and maps the work outcome onto the task state.
    Message settlement is performed in process_message_async(), based on any exception that propagates out of here:

    Note that max_delivery_count is used to determine when a TaskDeferredError should be escalated to a
    TaskRetryExhaustedError, signaling that the task has reached its retry limit and should be dead-lettered.
    Its value should match the maximum delivery count configured for the Service Bus queue (default is 10).

    The mapping between work outcomes and task state/message settlement is summarized below:
      | Outcome of work_fn                     | Task state | Message settlement |
      |----------------------------------------|------------|--------------------|
      | Returns normally                       | SUCCEEDED  | complete           |
      | Raises TaskFailedError                 | FAILED     | complete           |
      | Raises TaskDeferredError before limit  | RUNNING    | abandon / retry    |
      | Raises TaskDeferredError at limit      | FAILED     | dead-letter        |
      | Raises TaskInternalError / other       | FAILED     | dead-letter        |

    Note: Except for the deferred failures that have not yet reached the delivery limit, the task
    state is always recorded before the exception propagates, so the message is never settled before
    the outcome has been written as task state.
    """

    # Peek to get hold of the user_id and task_id for logging and task tracking purposes
    header = _peek_user_task_header(sb_msg)

    with LogScope(task_id=header.task_id):
        task_tracker = get_task_meta_tracker_for_user_id(header.user_id)

        # Use helper class to write task state updates. It will raise TaskTrackingError if we fail to
        # update the task state (which probably means the task has been deleted in the tracker)
        task_state_writer = TaskStateWriter(task_tracker=task_tracker, task_id=header.task_id)

        await task_state_writer.set_state_async(TaskState.RUNNING)

        try:
            success = await work_fn(task_tracker, sb_msg, abort_signal)

        except TaskFailedError as exc:
            # Final, user-facing failure: record FAILED, then re-raise so the message is COMPLETED.
            await task_state_writer.fail_task_async(
                status_msg=exc.status_msg, internal_error_msg=exc.internal_error_msg
            )
            raise

        except TaskDeferredError as exc:
            # Transient failure or cooperative shutdown:
            # Leave the task untouched (preserves RUNNING) unless the delivery count has reached the maximum.
            # In that case the task will be marked as FAILED and the special TaskRetryExhaustedError gets raised,
            # which signals to the caller that the task has failed and should be dead-lettered.
            if sb_msg.delivery_count is None or sb_msg.delivery_count >= max_delivery_count:
                await task_state_writer.fail_task_async(
                    status_msg="Task failed due to exhausting retries", internal_error_msg=repr(exc)
                )
                raise TaskRetryExhaustedError("Task reached the queue's maximum delivery count") from exc
            raise

        except Exception as exc:
            # TaskInternalError or any unexpected error: record FAILED, then re-raise so the message is dead-lettered for inspection.
            await task_state_writer.fail_task_async(
                status_msg="Task failed due to an error", internal_error_msg=repr(exc)
            )
            raise

        # The task succeeded: record SUCCEEDED in the task metadata.
        await task_state_writer.set_state_async(TaskState.SUCCEEDED, status_msg=success.status_msg)


def _peek_user_task_header(sb_msg: ServiceBusReceivedMessage) -> UserTaskMsgHeader:
    try:
        body_bytes = b"".join(sb_msg.body)
        return UserTaskMsgHeader.model_validate_json(body_bytes)
    except Exception as exc:
        raise MalformedMessageError(f"Failed to extract user/task header from message: {repr(exc)}") from exc
