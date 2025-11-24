import random
import time
from typing import Literal


class ExponentialBackoffTimer:
    """
    Exponential backoff timer with jitter and a max total duration.

    Initial delay is initial_delay_s, which increases exponentially with factor multiplier up to max_delay_s.
    The total duration of the timer is limited to max_total_duration_s.

    Delay calculation:
        delay = min(max_delay_s, initial_delay_s * multiplier^(step-1))

    Jitter modes:
        jitter = None       -> no jitter
        jitter = "full"     -> uniform(0, delay)
        jitter = float(x)   -> additive uniform(0, x)
    """

    def __init__(
        self,
        initial_delay_s: float,
        max_delay_s: float,
        max_total_duration_s: float,
        jitter: Literal["full"] | float | None = "full",
        multiplier: float = 2.0,
    ):
        if initial_delay_s <= 0:
            raise ValueError("initial_delay_s must be > 0")
        if max_delay_s < 0:
            raise ValueError("max_delay_s must be >= 0")
        if multiplier < 1.0:
            raise ValueError("multiplier must be >= 1.0")
        if max_total_duration_s < 0:
            raise ValueError("max_total_duration_s must be >= 0")
        if isinstance(jitter, float) and jitter < 0:
            raise ValueError("jitter (float) must be >= 0")

        self._initial_delay_s: float = initial_delay_s
        self._max_delay_s: float = max_delay_s
        self._max_total_duration_s: float = max_total_duration_s
        self._multiplier: float = multiplier
        self._jitter: Literal["full"] | float | None = jitter
        self._start_time_s: float = time.perf_counter()
        self._step: int = 0

    def next_delay_s(self, clamp_to_remaining: bool = True) -> float | None:
        """
        Return the next delay in seconds, or None if max_total_duration_s has expired.
        If clamp_to_remaining=True, the returned delay will not exceed the remaining time.
        """
        if self.remaining_s() <= 0:
            return None

        self._step += 1

        try:
            exp = self._multiplier ** (self._step - 1)
            raw_delay_s = self._initial_delay_s * exp
        except OverflowError:
            raw_delay_s = self._max_delay_s

        if self._jitter is None:
            delay_s = raw_delay_s
        elif self._jitter == "full":
            # Full jitter
            delay_s = random.uniform(0, raw_delay_s)  # nosec bandit B311
        else:
            # float -> additive jitter
            delay_s = raw_delay_s + random.uniform(0, self._jitter)  # nosec bandit B311

        # Clamp the delay (on the low side, just use half the initial delay)
        delay_s = max(self._initial_delay_s / 2, min(delay_s, self._max_delay_s))

        # Clamp to remaining time if requested
        if clamp_to_remaining:
            delay_s = min(delay_s, self.remaining_s())

        # Note comparison here to avoid returning tiny delays
        if delay_s < 0.001:
            return None

        return delay_s

    def remaining_s(self) -> float:
        """
        Get remaining time before max_total_duration_s is exceeded.
        """
        deadline_s = self._start_time_s + self._max_total_duration_s
        return max(0.0, deadline_s - time.perf_counter())

    def elapsed_s(self) -> float:
        """
        Get elapsed time in seconds.
        """
        return time.perf_counter() - self._start_time_s
