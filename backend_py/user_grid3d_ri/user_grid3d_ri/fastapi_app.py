import datetime
import logging

from fastapi import FastAPI

from .utils.inactivity_shutdown import InactivityShutdown
from .utils.radix_utils import IS_ON_RADIX_PLATFORM
from .routers import health_router
from .routers import grid_router
from .routers import intersection_router
from .routers import dev_router


logging.basicConfig(format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s", datefmt="%H:%M:%S")
logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger("httpcore").setLevel(logging.INFO)
logging.getLogger("httpx").setLevel(logging.INFO)
logging.getLogger("xtgeo").setLevel(logging.INFO)
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)


LOGGER = logging.getLogger(__name__)


app = FastAPI()

app.include_router(health_router.router)
app.include_router(grid_router.router)
app.include_router(intersection_router.router)
app.include_router(dev_router.router)


@app.get("/")
async def root() -> str:
    ret_str = f"user-grid3d-ri is alive at this time: {datetime.datetime.now()}"
    LOGGER.debug(f"Sending: {ret_str}")
    return ret_str


LOGGER.debug(f"{IS_ON_RADIX_PLATFORM=}")
if IS_ON_RADIX_PLATFORM:
    InactivityShutdown(app, inactivity_limit_minutes=5.0)
