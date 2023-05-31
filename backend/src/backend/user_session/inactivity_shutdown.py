import os
import time
from threading import Timer
from typing import Callable, Any

from fastapi import Request, FastAPI

LOCALHOST_DEVELOPMENT = os.environ.get("UVICORN_RELOAD") == "true"


class InactivityShutdown:
    def __init__(self, app: FastAPI, inactivity_limit_minutes: int) -> None:
        self._time_last_request: float = time.time()
        self._inactivity_limit_seconds: int = inactivity_limit_minutes * 60

        @app.middleware("http")
        async def _update_time_last_request(request: Request, call_next: Callable) -> Any:
            self._time_last_request = time.time()
            return await call_next(request)

        if not LOCALHOST_DEVELOPMENT:
            Timer(60.0, self.check_inactivity_threshold).start()

    def check_inactivity_threshold(self) -> None:
        if time.time() > self._time_last_request + self._inactivity_limit_seconds:
            os._exit(0)
        else:
            Timer(60.0, self.check_inactivity_threshold).start()
