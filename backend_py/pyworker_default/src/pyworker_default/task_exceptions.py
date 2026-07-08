"""
Exception taxonomy for worker message/task processing.

Each of the main three exceptions map deterministically to a Service Bus settlement outcome.
The base classes below correspond 1:1 to the three possible settlement outcomes.
The subclasses only add diagnostic/telemetry nuance and share their base's settlement behaviour.

    | Exception (base)          | SB message settlement   | Resulting task state     |
    |---------------------------|-------------------------|--------------------------|
    | TaskFailedError           | complete                | FAILED (user facing msg) |
    |                           |                         |                          |
    | TaskDeferredError         | abandon (retry message) | untouched                |
    |   - TaskRetryError        |                         |                          |
    |   - TaskAbortedError      |                         |                          |
    |                           |                         |                          |
    | TaskInternalError         | dead-letter             | FAILED (generic msg)     |
    |   - MalformedMessageError |                         |                          |
    |   - TaskTrackingError     |                         |                          |

Any exception that is NOT one of these is treated like TaskInternalError:
    => SB message settled as DEAD-LETTERED, task marked FAILED with a generic message.

Therefore the task code only needs to utilize these exceptions when it wants to *deviate* from that default
by providing the user with a message or asking for retry of the message processing.
As such, all the exceptions derived from TaskInternalError are only used for diagnostic/telemetry purposes
and do not affect the settlement behaviour.
"""


class TaskFailedError(Exception):
    """
    The task failed in a final, user-facing way and the end user should be informed. Returning it to the message queue
    for automatic retrying would not help.

    Raise this to report an expected/business failure the user cares about (e.g. invalid input, requested
    data not found, not authorized). `status_message` is surfaced to the user, while the optional
    `internal_error_message` is retained for logging/telemetry only and never shown to the user.

    => SB message COMPLETED, task state FAILED with `status_message` (not retried, not dead-lettered).
    """

    def __init__(self, status_message: str, internal_error_message: str | None = None) -> None:
        super().__init__(status_message)
        self.status_message = status_message
        self.internal_error_message = internal_error_message


class TaskDeferredError(Exception):
    """
    Base class for "try again later" outcomes: the task was not completed and the message should be
    delivered again (possibly picked up by another worker).
    
    => SB message ABANDONED (returned to the queue for redelivery), task state left untouched.
    """


class TaskRetryError(TaskDeferredError):
    """
    Transient failure where retrying later has a reasonable chance of succeeding, e.g. an underlying
    service was temporarily unavailable or timed out.
    """


class TaskAbortedError(TaskDeferredError):
    """
    Cooperative abort of an in-flight task, e.g. because the worker is shutting down. This is not a failure,
    the task just needs to run again elsewhere.
    """


class TaskInternalError(Exception):
    """
    Base class for deliberate, unrecoverable internal failures. These are not the user's concern and
    retrying would not help; the message needs a human to inspect it.

    => SB message DEAD-LETTERED, task state FAILED with a generic user facing message + possibly internal error details.
    """


class MalformedMessageError(TaskInternalError):
    """
    The message itself cannot be interpreted, e.g. an unparseable body or failed decryption
    """


class TaskTrackingError(TaskInternalError):
    """
    A task-tracking/state invariant was violated, e.g. the task meta record or an expected store key is missing when it should exist.
    Most likely indicates a bug or inconsistent state or expired internal data rather than a user error.
    """

