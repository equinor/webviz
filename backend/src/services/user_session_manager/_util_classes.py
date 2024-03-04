import logging
import time
from contextlib import AbstractContextManager
from types import TracebackType

from pottery import Redlock

LOGGER = logging.getLogger(__name__)


class TimeCounter:
    def __init__(self, duration_s: float) -> None:
        self._start_s = time.perf_counter()
        self._end_s = self._start_s + duration_s

    def elapsed_s(self) -> float:
        return time.perf_counter() - self._start_s

    def remaining_s(self) -> float:
        time_now = time.perf_counter()
        remaining = self._end_s - time_now
        return remaining if remaining > 0 else 0


class LockReleasingContext(AbstractContextManager):
    def __init__(self, acquired_lock: Redlock) -> None:
        self._acquired_lock: Redlock = acquired_lock

    def __enter__(self) -> Redlock:
        LOGGER.debug("LockReleasingContext.__enter__()")
        return self._acquired_lock

    def __exit__(
        self, _exc_type: type[BaseException] | None, _exc_value: BaseException | None, _traceback: TracebackType | None
    ) -> bool | None:
        LOGGER.debug("LockReleasingContext.__exit__() - releasing lock")
        self._acquired_lock.release()

        # What is the correct return value here?
        # If there was an exception, AND we want to suppress it, return True
        return None

        # We may want to silence this exception, but not until we have control
        # try:
        #     self._acquired_lock.release()
        # except ReleaseUnlockedLock:
        #     pass
