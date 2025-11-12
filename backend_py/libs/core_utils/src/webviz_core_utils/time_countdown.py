import time


class TimeCountdown:
    def __init__(self, duration_s: float, action_interval_s: float | None) -> None:
        self._start_s = time.perf_counter()
        self._end_s = self._start_s + duration_s
        self.action_interval_s: float | None = action_interval_s
        self.last_action_time_s = self._start_s

    def elapsed_s(self) -> float:
        return time.perf_counter() - self._start_s

    def remaining_s(self) -> float:
        time_now = time.perf_counter()
        remaining = self._end_s - time_now
        return remaining if remaining > 0 else 0

    def is_finished(self) -> bool:
        time_now = time.perf_counter()
        return time_now >= self._end_s

    def is_action_due(self) -> bool:
        if self.action_interval_s is None:
            return False

        time_now = time.perf_counter()
        if time_now - self.last_action_time_s >= self.action_interval_s:
            self.last_action_time_s = time_now
            return True
        return False
