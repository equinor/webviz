import os
import time
from threading import Timer
from typing import Callable, Any
import logging

from fastapi import Request, FastAPI

LOGGER = logging.getLogger(__name__)


class InactivityShutdown:
    def __init__(self, app: FastAPI, inactivity_limit_minutes: int) -> None:
        self._time_last_request: float = time.time()
        self._inactivity_limit_seconds: int = inactivity_limit_minutes * 60

        @app.middleware("http")
        async def _update_time_last_request(request: Request, call_next: Callable) -> Any:
            self._time_last_request = time.time()
            return await call_next(request)

        LOGGER.info(f"Enabled shutdown after {inactivity_limit_minutes} min of inactivity")
        Timer(60.0, self.check_inactivity_threshold).start()

    def check_inactivity_threshold(self) -> None:
        inactive_time_s = time.time() - self._time_last_request
        LOGGER.debug(f"check_inactivity_threshold() {inactive_time_s=:.2f}")

        if inactive_time_s > self._inactivity_limit_seconds:
            LOGGER.info(f"Shutting down due to inactivity for {inactive_time_s=:.2f}")
            os._exit(0)

        Timer(60.0, self.check_inactivity_threshold).start()
