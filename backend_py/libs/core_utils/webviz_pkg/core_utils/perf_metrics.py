from .perf_timer import PerfTimer


class PerfMetrics:
    def __init__(self) -> None:
        self._perf_timer = PerfTimer()
        self._metrics_dict: dict[str, int] = {}

    def set_metric(self, metric_name: str, duration_ms: int | float) -> None:
        int_duration_ms = int(duration_ms)
        self._metrics_dict[metric_name] = int_duration_ms

    def record_lap(self, metric_name: str) -> None:
        """Records metric with a duration since the last lap"""
        self.set_metric(metric_name, self._perf_timer.lap_ms())

    def record_elapsed(self, metric_name: str) -> None:
        """Records metric with a duration since the start"""
        self.set_metric(metric_name, self._perf_timer.elapsed_ms())

    def reset_lap_timer(self) -> None:
        """Resets the internal lap timer"""
        self._perf_timer.lap_ms()

    def get_elapsed_ms(self) -> int:
        """Will return the elapsed time up until now"""
        return self._perf_timer.elapsed_ms()

    def to_dict(self) -> dict[str, int]:
        return self._metrics_dict.copy()

    def to_string(self, include_total_elapsed: bool = True) -> str:
        """
        Returns a string representation of the metrics (in ms) suitable for logging.

        When include_total_elapsed is True, the total elapsed time will be included in the string as well and
        the string will be formatted as:
            '300ms (metric1=100ms, metric2=200ms)'

        If include_total_elapsed is False, only the actual recorded metrics will be included, e.g.:
            'metric1=100ms, metric2=200ms'
        """
        total_elapsed_ms = self.get_elapsed_ms() if include_total_elapsed else None
        return make_metrics_string(self._metrics_dict, total_elapsed_ms)

    def to_string_s(self, include_total_elapsed: bool = True) -> str:
        """
        Returns string representation of the metrics (in s), see to_string() for more details.
        """
        total_elapsed_ms = self.get_elapsed_ms() if include_total_elapsed else None
        return make_metrics_string_s(self._metrics_dict, total_elapsed_ms)


def make_metrics_string(perf_metrics_dict_ms: dict[str, int], total_elapsed_ms: int | None = None) -> str:
    """
    Returns a string representation of the specified metrics (in ms) suitable for logging.

    When total_elapsed_ms is specified, the total elapsed time will be included in the string as
     well and the string will be formatted as:
        '300ms (metric1=100ms, metric2=200ms)'

    If total_elapsed_ms is None, only the actual recorded metrics will be included, e.g.:
        'metric1=100ms, metric2=200ms'
    """
    metrics_str = ", ".join([f"{key}={value}ms" for key, value in perf_metrics_dict_ms.items()])
    if total_elapsed_ms is not None:
        return f"{total_elapsed_ms}ms ({metrics_str})"

    return metrics_str


def make_metrics_string_s(perf_metrics_dict_ms: dict[str, int], total_elapsed_ms: int | None = None) -> str:
    """
    Returns string representation of the metrics (in s), see make_metrics_string() for more details.
    """
    metrics_str = ", ".join([f"{key}={value/1000.0:.2f}s" for key, value in perf_metrics_dict_ms.items()])
    if total_elapsed_ms is not None:
        return f"{total_elapsed_ms/1000.0:.2f}s ({metrics_str})"

    return metrics_str
