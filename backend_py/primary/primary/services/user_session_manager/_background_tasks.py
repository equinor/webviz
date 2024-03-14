import logging
import asyncio
from typing import Coroutine


LOGGER = logging.getLogger(__name__)

_background_tasks: set[asyncio.Task] = set()


def _task_done_cb(task: asyncio.Task) -> None:
    # To prevent keeping references to finished tasks forever, make each task remove its
    # own reference from the set after completion
    _background_tasks.discard(task)

    # Look for exceptions and log them
    try:
        # Also marks that the exception has been handled
        exc = task.exception()
        if exc:
            LOGGER.exception("Background task raised an exception", exc_info=exc)
    except asyncio.exceptions.CancelledError:
        pass


def run_in_background_task(coroutine: Coroutine) -> asyncio.Task:
    """
    Create a background task and schedule it to run in a fire-and-forget fashion
    """
    task = asyncio.create_task(coroutine)

    # Add task to the set, creating a strong reference to the task, which prevents it from being garbage collected
    # See https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task
    _background_tasks.add(task)

    task.add_done_callback(_task_done_cb)
    return task
