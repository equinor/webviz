from starlette.responses import MutableHeaders, Response

from webviz_pkg.core_utils.perf_timer import PerfTimer


class PerfMetrics:
    def __init__(self, target_response_for_metrics: Response | None = None):
        """
        You can pass a reference to a FastAPI Response object to this class, and the
        metrics will be added to the response's 'Server-Timing' header.
        """
        self._perf_timer = PerfTimer()
        self._metrics_dict: dict[str, int] = {}
        self._headers: MutableHeaders | None = None
        if target_response_for_metrics is not None:
            self._headers = target_response_for_metrics.headers

    def set_metric(self, metric_name: str, duration_ms: int | float) -> None:
        int_duration_ms = int(duration_ms)
        self._metrics_dict[metric_name] = int_duration_ms

        if self._headers is not None:
            self._headers.append("Server-Timing", f"{metric_name}; dur={int_duration_ms}")

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

    def to_string(self, include_total_elapsed: bool = True) -> str:
        """
        Returns a string representation of the metrics suitable for logging.

        When include_total_elapsed is True, the total elapsed time will be included in the string as well and
        the string will be formatted as:
            '300ms (metric1=100ms, metric2=200ms)'

        If include_total_elapsed is False, only the actual recorded metrics will be included, e.g.:
            'metric1=100ms, metric2=200ms'
        """
        metrics_str = ", ".join([f"{key}={value}ms" for key, value in self._metrics_dict.items()])

        if include_total_elapsed:
            return f"{self.get_elapsed_ms()}ms ({metrics_str})"

        return metrics_str
