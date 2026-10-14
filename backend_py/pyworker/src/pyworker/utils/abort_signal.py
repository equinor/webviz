import asyncio

from ..task_exceptions import TaskAbortedError


class AbortSignal:
    """
    Cooperative abort signal that is passed to the task work functions.

    Task code should preferably call raise_if_aborted() at suitable checkpoints; when the worker is shutting down
    this raises TaskAbortedError, which leaves the task untouched and abandons the message so it can be retried elsewhere.
    """

    def __init__(self, shutdown_event: asyncio.Event) -> None:
        self._shutdown_event = shutdown_event

    @property
    def is_aborted(self) -> bool:
        return self._shutdown_event.is_set()

    def raise_if_aborted(self) -> None:
        if self._shutdown_event.is_set():
            raise TaskAbortedError("Worker is shutting down; aborting task so it can be retried")
