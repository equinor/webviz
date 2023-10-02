from starlette.responses import MutableHeaders, Response

from src.services.utils.perf_timer import PerfTimer


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

    def set_metric(self, metric_name: str, duration_ms: int):
        int_duration_ms = int(duration_ms)
        self._metrics_dict[metric_name] = int(int_duration_ms)

        if self._headers is not None:
            self._headers.append("Server-Timing", f"{metric_name}; dur={int_duration_ms}")

    def record_lap(self, metric_name: str):
        """Records metric with a duration since the last lap"""
        self.set_metric(metric_name, self._perf_timer.lap_ms())

    def record_elapsed(self, metric_name: str):
        """Records metric with a duration since the start"""
        self.set_metric(metric_name, self._perf_timer.elapsed_ms())

    def reset_lap_timer(self):
        """Resets the internal lap timer"""
        self._perf_timer.lap_ms()

    def get_elapsed_ms(self):
        """Will return the elapsed time up until now"""
        return self._perf_timer.elapsed_ms()

    def get_as_string(self) -> str:
        return ", ".join([f"{key}={value}ms" for key, value in self._metrics_dict.items()])
